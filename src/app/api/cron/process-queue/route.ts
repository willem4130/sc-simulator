/**
 * Queue Processor Cron
 *
 * Processes pending items in WorkflowQueue
 * Triggered by Vercel Cron every minute
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { WorkflowType, QueueStatus } from '@prisma/client';
import { runContractDistribution } from '@/lib/workflows/contract-distribution';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 seconds max for cron jobs

// Verify cron secret to prevent unauthorized access
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;

  // In development, allow without secret
  if (process.env.NODE_ENV === 'development') {
    return true;
  }

  // If CRON_SECRET is set, verify it
  if (cronSecret) {
    return authHeader === `Bearer ${cronSecret}`;
  }

  // If no secret configured, allow (but log warning)
  console.warn('[Cron] No CRON_SECRET configured - allowing request');
  return true;
}

export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[Cron] Processing queue started');

    // Get pending items scheduled for now or earlier
    const pendingItems = await prisma.workflowQueue.findMany({
      where: {
        status: QueueStatus.PENDING,
        scheduledFor: { lte: new Date() },
        attempts: { lt: prisma.workflowQueue.fields.maxAttempts },
      },
      orderBy: { scheduledFor: 'asc' },
      take: 10, // Process up to 10 items per run
    });

    console.log(`[Cron] Found ${pendingItems.length} pending items`);

    const results = await Promise.allSettled(
      pendingItems.map((item) => processQueueItem(item))
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    console.log('[Cron] Processing complete:', { succeeded, failed });

    return NextResponse.json({
      success: true,
      processed: pendingItems.length,
      succeeded,
      failed,
    });
  } catch (error) {
    console.error('[Cron] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function processQueueItem(item: {
  id: string;
  workflowType: WorkflowType;
  projectId: string | null;
  userId: string | null;
  payload: any;
  attempts: number;
  maxAttempts: number;
}) {
  console.log(`[Cron] Processing item ${item.id} (${item.workflowType})`);

  // Mark as processing
  await prisma.workflowQueue.update({
    where: { id: item.id },
    data: {
      status: QueueStatus.PROCESSING,
      startedAt: new Date(),
      attempts: item.attempts + 1,
    },
  });

  try {
    // Execute workflow based on type
    switch (item.workflowType) {
      case WorkflowType.CONTRACT_DISTRIBUTION:
        await processContractDistribution(item);
        break;

      case WorkflowType.HOURS_REMINDER:
        await processHoursReminder(item);
        break;

      case WorkflowType.INVOICE_GENERATION:
        await processInvoiceGeneration(item);
        break;

      default:
        throw new Error(`Unknown workflow type: ${item.workflowType}`);
    }

    // Mark as completed
    await prisma.workflowQueue.update({
      where: { id: item.id },
      data: {
        status: QueueStatus.COMPLETED,
        completedAt: new Date(),
      },
    });

    console.log(`[Cron] Item ${item.id} completed successfully`);
  } catch (error) {
    console.error(`[Cron] Item ${item.id} failed:`, error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const newAttempts = item.attempts + 1;

    // Mark as failed if max attempts reached, otherwise back to pending
    await prisma.workflowQueue.update({
      where: { id: item.id },
      data: {
        status: newAttempts >= item.maxAttempts ? QueueStatus.FAILED : QueueStatus.PENDING,
        error: errorMessage,
        // Exponential backoff: 1min, 5min, 15min
        scheduledFor: newAttempts >= item.maxAttempts
          ? undefined
          : new Date(Date.now() + Math.pow(5, newAttempts) * 60 * 1000),
      },
    });

    throw error;
  }
}

/**
 * Process contract distribution for a specific employee linked to a project
 */
async function processContractDistribution(item: {
  projectId: string | null;
  userId: string | null;
  payload: any;
}) {
  const { projectId, payload } = item;

  if (!projectId) {
    throw new Error('Missing projectId for contract distribution');
  }

  // If we have specific employee info, process just that employee
  if (payload.employeeId) {
    await runContractDistributionForEmployee({
      projectId,
      employeeId: payload.employeeId,
      employeeName: payload.employeeName,
      employeeEmail: payload.employeeEmail,
    });
  } else {
    // Fallback to processing all employees on the project
    await runContractDistribution({ projectId });
  }
}

/**
 * Run contract distribution for a single employee
 */
async function runContractDistributionForEmployee(options: {
  projectId: string;
  employeeId: string;
  employeeName?: string;
  employeeEmail?: string;
}) {
  const { projectId, employeeId, employeeName, employeeEmail } = options;

  // Get project
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project) {
    throw new Error(`Project not found: ${projectId}`);
  }

  // Find or create user
  let user = await prisma.user.findUnique({
    where: { simplicateEmployeeId: employeeId },
  });

  if (!user && employeeEmail) {
    // Try to find by email
    user = await prisma.user.findUnique({
      where: { email: employeeEmail },
    });

    if (user && !user.simplicateEmployeeId) {
      // Link existing user to Simplicate employee
      user = await prisma.user.update({
        where: { id: user.id },
        data: { simplicateEmployeeId: employeeId },
      });
    }
  }

  if (!user && employeeEmail) {
    // Create new user
    user = await prisma.user.create({
      data: {
        email: employeeEmail,
        name: employeeName,
        simplicateEmployeeId: employeeId,
        role: 'TEAM_MEMBER',
      },
    });
    console.log('[ContractDist] Created user:', user.id);
  }

  if (!user) {
    console.warn('[ContractDist] Could not find or create user for employee:', employeeId);
    return;
  }

  // Check if contract already exists for this user/project combo
  const existingContract = await prisma.contract.findFirst({
    where: {
      projectId,
      userId: user.id,
    },
  });

  if (existingContract) {
    console.log('[ContractDist] Contract already exists:', existingContract.id);
    return;
  }

  // Import crypto for upload token
  const crypto = await import('crypto');
  const uploadToken = crypto.randomBytes(32).toString('hex');

  // Create contract record
  const contract = await prisma.contract.create({
    data: {
      projectId,
      userId: user.id,
      templateName: 'Standard Contract',
      uploadToken,
      status: 'PENDING',
    },
  });

  // Create notification
  const appUrl = process.env.NEXTAUTH_URL || process.env.VERCEL_URL || 'http://localhost:3000';
  const uploadUrl = `${appUrl}/workspace/contracts/${contract.id}/upload?token=${uploadToken}`;

  await prisma.notification.create({
    data: {
      userId: user.id,
      type: 'CONTRACT_ASSIGNED',
      title: 'Contract Required',
      message: `You've been assigned to project "${project.name}" and need to sign a contract.`,
      actionUrl: uploadUrl,
      channels: JSON.stringify(['EMAIL', 'IN_APP']),
      metadata: {
        projectId,
        contractId: contract.id,
        uploadUrl,
      },
    },
  });

  // Update contract status
  await prisma.contract.update({
    where: { id: contract.id },
    data: {
      status: 'SENT',
      sentAt: new Date(),
    },
  });

  console.log('[ContractDist] Contract created and notification sent:', contract.id);

  // Create automation log
  await prisma.automationLog.create({
    data: {
      projectId,
      workflowType: 'CONTRACT_DISTRIBUTION',
      status: 'SUCCESS',
      completedAt: new Date(),
      metadata: {
        contractId: contract.id,
        userId: user.id,
        employeeId,
      },
    },
  });
}

/**
 * Process hours reminder workflow
 * Sends reminders to employees who haven't submitted hours for a period
 */
async function processHoursReminder(item: {
  projectId: string | null;
  userId: string | null;
  payload: any;
}) {
  const { projectId, payload } = item;
  const period = payload?.period || 'previous'; // 'current' or 'previous'

  console.log('[Cron] Processing hours reminder:', { projectId, period });

  // Import date-fns
  const { startOfMonth, endOfMonth, subMonths, format } = await import('date-fns');

  // Determine the period
  const now = new Date();
  const periodDate = period === 'previous' ? subMonths(now, 1) : now;
  const periodStart = startOfMonth(periodDate);
  const periodEnd = endOfMonth(periodDate);
  const periodLabel = format(periodDate, 'MMMM yyyy');

  // Get active project members with their hours for the period
  const whereClause: any = {
    leftAt: null, // Active members only
  };

  if (projectId) {
    whereClause.projectId = projectId;
  }

  const projectMembers = await prisma.projectMember.findMany({
    where: whereClause,
    include: {
      project: {
        select: {
          id: true,
          name: true,
          status: true,
        },
      },
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  // Only include members from active projects
  const activeMembers = projectMembers.filter(m => m.project.status === 'ACTIVE');

  // Get unique users
  const userMap = new Map<string, {
    userId: string;
    userName: string | null;
    userEmail: string;
    projects: Array<{ id: string; name: string }>;
  }>();

  for (const member of activeMembers) {
    if (!member.user.email) continue;

    const existing = userMap.get(member.userId);
    if (existing) {
      existing.projects.push({ id: member.project.id, name: member.project.name });
    } else {
      userMap.set(member.userId, {
        userId: member.userId,
        userName: member.user.name,
        userEmail: member.user.email,
        projects: [{ id: member.project.id, name: member.project.name }],
      });
    }
  }

  // For each user, check if they have submitted hours in the period
  const usersToRemind: Array<{
    userId: string;
    userName: string | null;
    userEmail: string;
    projects: Array<{ id: string; name: string }>;
    hoursLogged: number;
  }> = [];

  for (const [userId, userData] of userMap) {
    // Count hours for this user in the period
    const hoursAgg = await prisma.hoursEntry.aggregate({
      where: {
        userId,
        date: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      _sum: { hours: true },
    });

    const hoursLogged = hoursAgg._sum.hours || 0;

    // If less than 1 hour logged (allowing for rounding), add to remind list
    if (hoursLogged < 1) {
      usersToRemind.push({
        ...userData,
        hoursLogged,
      });
    }
  }

  console.log('[Cron] Users to remind:', usersToRemind.length, 'out of', userMap.size);

  if (usersToRemind.length === 0) {
    // Create success log
    await prisma.automationLog.create({
      data: {
        projectId: projectId || null,
        workflowType: 'HOURS_REMINDER',
        status: 'SUCCESS',
        completedAt: new Date(),
        metadata: {
          period: periodLabel,
          totalUsers: userMap.size,
          remindersNeeded: 0,
          message: 'All users have logged hours',
        },
      },
    });
    return;
  }

  // Send reminders
  const { Resend } = await import('resend');
  const resendApiKey = process.env.RESEND_API_KEY;
  const emailFrom = process.env.EMAIL_FROM || 'noreply@simplicate-automations.vercel.app';

  if (!resendApiKey) {
    console.warn('[Cron] RESEND_API_KEY not configured, skipping email send');
    await prisma.automationLog.create({
      data: {
        projectId: projectId || null,
        workflowType: 'HOURS_REMINDER',
        status: 'FAILED',
        completedAt: new Date(),
        error: 'Email service not configured',
        metadata: { period: periodLabel, usersToRemind: usersToRemind.length },
      },
    });
    return;
  }

  const resend = new Resend(resendApiKey);
  let successCount = 0;
  let failCount = 0;

  for (const user of usersToRemind) {
    try {
      const projectList = user.projects.map(p => `• ${p.name}`).join('\n');
      const appUrl = process.env.NEXTAUTH_URL || 'https://simplicate-automations.vercel.app';

      await resend.emails.send({
        from: emailFrom,
        to: [user.userEmail],
        subject: `Herinnering: Uren invoeren voor ${periodLabel}`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
                .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
                .content { background: #ffffff; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; }
                .info-box { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px 20px; margin: 20px 0; }
                .button { display: inline-block; padding: 14px 28px; background: #f59e0b; color: white !important; text-decoration: none; border-radius: 6px; margin: 10px 5px; font-weight: 600; }
                .footer { text-align: center; margin-top: 20px; color: #718096; font-size: 12px; }
                ul { margin: 10px 0; padding-left: 20px; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1 style="margin: 0;">Uren Herinnering</h1>
              </div>
              <div class="content">
                <p>Beste ${user.userName || user.userEmail},</p>

                <p>We hebben nog geen uren van je ontvangen voor <strong>${periodLabel}</strong>.</p>

                <div class="info-box">
                  <strong>Projecten waar je aan gekoppeld bent:</strong>
                  <ul>
                    ${user.projects.map(p => `<li>${p.name}</li>`).join('')}
                  </ul>
                </div>

                <p>Voer je uren in via Simplicate zodat we een volledig overzicht hebben.</p>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://app.simplicate.com" class="button">Open Simplicate</a>
                </div>

                <p style="font-size: 14px; color: #718096;">
                  Dit is een automatische herinnering. Heb je al uren ingevoerd? Dan kun je deze mail negeren.
                </p>

                <p>Met vriendelijke groet,<br>Het team</p>
              </div>
              <div class="footer">
                <p>Simplicate Automation System</p>
              </div>
            </body>
          </html>
        `,
      });

      // Track in SentEmail
      await prisma.sentEmail.create({
        data: {
          userId: user.userId,
          toEmail: user.userEmail,
          subject: `Herinnering: Uren invoeren voor ${periodLabel}`,
          status: 'SENT',
          sentAt: new Date(),
        },
      });

      successCount++;
      console.log('[Cron] Hours reminder sent to:', user.userEmail);
    } catch (error) {
      failCount++;
      console.error('[Cron] Failed to send hours reminder to:', user.userEmail, error);
    }
  }

  // Create automation log
  await prisma.automationLog.create({
    data: {
      projectId: projectId || null,
      workflowType: 'HOURS_REMINDER',
      status: failCount === 0 ? 'SUCCESS' : (successCount > 0 ? 'SUCCESS' : 'FAILED'),
      completedAt: new Date(),
      metadata: {
        period: periodLabel,
        totalUsers: userMap.size,
        remindersNeeded: usersToRemind.length,
        sent: successCount,
        failed: failCount,
      },
    },
  });

  console.log('[Cron] Hours reminder complete:', { sent: successCount, failed: failCount });
}

/**
 * Process invoice generation workflow (placeholder)
 */
async function processInvoiceGeneration(item: {
  projectId: string | null;
  userId: string | null;
  payload: any;
}) {
  // TODO: Implement in Phase 5
  console.log('[Cron] Invoice generation not yet implemented');
}
