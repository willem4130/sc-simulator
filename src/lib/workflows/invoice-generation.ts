/**
 * Invoice Generation Workflow
 *
 * Generates invoices based on submitted hours
 * Notifies admins for approval
 */

import { prisma } from '@/lib/db';
import { getSimplicateClient } from '@/lib/simplicate';
import { sendNotification } from '@/lib/notifications';
import { NotificationType, WorkflowType, AutomationStatus } from '@prisma/client';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export interface InvoiceGenerationOptions {
  projectId?: string;
  periodStart?: Date;
  periodEnd?: Date;
}

export async function runInvoiceGeneration(options: InvoiceGenerationOptions = {}) {
  const logId = await createAutomationLog(options.projectId);

  try {
    console.log('[Invoice Generation] Starting');

    await updateAutomationLog(logId, AutomationStatus.RUNNING);

    // Determine period
    const now = new Date();
    const periodStart = options.periodStart || startOfMonth(now);
    const periodEnd = options.periodEnd || endOfMonth(now);
    const periodLabel = format(periodStart, 'MMMM yyyy');

    console.log('[Invoice Generation] Period:', { periodLabel, periodStart, periodEnd });

    // Find projects with approved hours ready for invoicing
    const projectsToInvoice = await findProjectsReadyForInvoicing({
      projectId: options.projectId,
      periodStart,
      periodEnd,
    });

    console.log('[Invoice Generation] Projects ready:', projectsToInvoice.length);

    if (projectsToInvoice.length === 0) {
      await updateAutomationLog(logId, AutomationStatus.SUCCESS, {
        message: 'No projects ready for invoicing',
      });
      return { success: true, invoicesCreated: 0 };
    }

    // Generate invoices
    const results = await Promise.allSettled(
      projectsToInvoice.map((project) =>
        generateInvoice({
          project,
          periodStart,
          periodEnd,
          periodLabel,
        })
      )
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    console.log('[Invoice Generation] Completed:', { succeeded, failed });

    await updateAutomationLog(logId, AutomationStatus.SUCCESS, {
      period: periodLabel,
      invoicesCreated: succeeded,
      failed,
    });

    return {
      success: true,
      invoicesCreated: succeeded,
      errors: failed > 0 ? results.filter((r) => r.status === 'rejected') : undefined,
    };
  } catch (error) {
    console.error('[Invoice Generation] Error:', error);

    await updateAutomationLog(
      logId,
      AutomationStatus.FAILED,
      undefined,
      error instanceof Error ? error.message : 'Unknown error'
    );

    throw error;
  }
}

async function findProjectsReadyForInvoicing(options: {
  projectId?: string;
  periodStart: Date;
  periodEnd: Date;
}) {
  // Find projects with approved hours that haven't been invoiced
  const projects = await prisma.project.findMany({
    where: {
      ...(options.projectId ? { id: options.projectId } : {}),
      status: 'ACTIVE',
      hoursEntries: {
        some: {
          date: {
            gte: options.periodStart,
            lte: options.periodEnd,
          },
          status: 'APPROVED',
          invoiceId: null, // Not yet invoiced
        },
      },
    },
    include: {
      hoursEntries: {
        where: {
          date: {
            gte: options.periodStart,
            lte: options.periodEnd,
          },
          status: 'APPROVED',
          invoiceId: null,
        },
        include: {
          user: true,
        },
      },
    },
  });

  return projects.filter((p) => p.hoursEntries.length > 0);
}

async function generateInvoice(options: {
  project: any;
  periodStart: Date;
  periodEnd: Date;
  periodLabel: string;
}) {
  const { project, periodStart, periodEnd, periodLabel } = options;

  // Calculate total amount
  let totalHours = 0;
  let totalAmount = 0;

  for (const entry of project.hoursEntries) {
    totalHours += entry.hours;
    totalAmount += entry.hours * (entry.hourlyRate || 0);
  }

  console.log('[Invoice Generation] Project:', {
    name: project.name,
    totalHours,
    totalAmount,
  });

  // Create invoice in our database
  const invoice = await prisma.invoice.create({
    data: {
      projectId: project.id,
      amount: totalAmount,
      description: `Invoice for ${periodLabel} - ${totalHours} hours`,
      periodStart,
      periodEnd,
      status: 'DRAFT',
    },
  });

  // Link hours entries to invoice
  await prisma.hoursEntry.updateMany({
    where: {
      id: {
        in: project.hoursEntries.map((e: any) => e.id),
      },
    },
    data: {
      invoiceId: invoice.id,
      status: 'INVOICED',
    },
  });

  // Create draft invoice in Simplicate
  try {
    const simplicateClient = getSimplicateClient();
    const simplicateInvoice = await simplicateClient.createInvoice({
      project_id: project.simplicateId,
      status: 'draft',
    });

    // Update invoice with Simplicate ID
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: {
        simplicateInvoiceId: simplicateInvoice.id,
        invoiceNumber: simplicateInvoice.invoice_number,
      },
    });

    console.log('[Invoice Generation] Created in Simplicate:', simplicateInvoice.id);
  } catch (error) {
    console.error('[Invoice Generation] Simplicate error:', error);
    // Continue even if Simplicate sync fails
  }

  // Notify admins
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
  });

  await Promise.all(
    admins.map((admin) =>
      sendNotification({
        userId: admin.id,
        type: NotificationType.INVOICE_GENERATED,
        title: 'Invoice Ready for Approval',
        message: `Invoice for project "${project.name}" (${periodLabel}) has been generated. Amount: $${totalAmount.toFixed(2)}`,
        actionUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/admin/invoices/${invoice.id}`,
        metadata: {
          projectId: project.id,
          invoiceId: invoice.id,
          amount: totalAmount,
          hours: totalHours,
        },
      })
    )
  );

  console.log('[Invoice Generation] Created invoice:', invoice.id);

  return invoice;
}

async function createAutomationLog(projectId?: string) {
  const log = await prisma.automationLog.create({
    data: {
      projectId: projectId || null,
      workflowType: WorkflowType.INVOICE_GENERATION,
      status: AutomationStatus.PENDING,
    },
  });

  return log.id;
}

async function updateAutomationLog(
  logId: string,
  status: AutomationStatus,
  metadata?: any,
  error?: string
) {
  await prisma.automationLog.update({
    where: { id: logId },
    data: {
      status,
      ...(status === AutomationStatus.SUCCESS || status === AutomationStatus.FAILED
        ? { completedAt: new Date() }
        : {}),
      ...(metadata ? { metadata } : {}),
      ...(error ? { error } : {}),
    },
  });
}
