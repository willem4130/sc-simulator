/**
 * Hours Reminder Workflow
 *
 * Checks for team members who haven't submitted hours
 * Sends reminders based on user preferences
 */

import { prisma } from '@/lib/db';
import { sendNotification } from '@/lib/notifications';
import { NotificationType, WorkflowType, AutomationStatus } from '@prisma/client';
import { startOfMonth, endOfMonth, format, subMonths } from 'date-fns';

export interface HoursReminderOptions {
  projectId?: string;
  period?: 'current' | 'previous';
}

export async function runHoursReminder(options: HoursReminderOptions = {}) {
  const logId = await createAutomationLog(options.projectId);

  try {
    console.log('[Hours Reminder] Starting');

    await updateAutomationLog(logId, AutomationStatus.RUNNING);

    // Determine the period
    const now = new Date();
    const periodDate = options.period === 'previous' ? subMonths(now, 1) : now;
    const periodStart = startOfMonth(periodDate);
    const periodEnd = endOfMonth(periodDate);
    const periodLabel = format(periodDate, 'MMMM yyyy');

    console.log('[Hours Reminder] Period:', { periodLabel, periodStart, periodEnd });

    // Find projects and their team members with missing hours
    const projectsWithMissingHours = await findProjectsWithMissingHours({
      projectId: options.projectId,
      periodStart,
      periodEnd,
    });

    console.log('[Hours Reminder] Projects with missing hours:', projectsWithMissingHours.length);

    if (projectsWithMissingHours.length === 0) {
      await updateAutomationLog(logId, AutomationStatus.SUCCESS, {
        message: 'No missing hours found',
      });
      return { success: true, remindersSent: 0 };
    }

    // Send reminders
    const results = await Promise.allSettled(
      projectsWithMissingHours.flatMap((project) =>
        project.teamMembers.map((member) =>
          sendHoursReminder({
            user: member,
            project,
            period: periodLabel,
            periodStart,
            periodEnd,
          })
        )
      )
    );

    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    console.log('[Hours Reminder] Completed:', { succeeded, failed });

    await updateAutomationLog(logId, AutomationStatus.SUCCESS, {
      period: periodLabel,
      projects: projectsWithMissingHours.length,
      remindersSent: succeeded,
      failed,
    });

    return {
      success: true,
      remindersSent: succeeded,
      errors: failed > 0 ? results.filter((r) => r.status === 'rejected') : undefined,
    };
  } catch (error) {
    console.error('[Hours Reminder] Error:', error);

    await updateAutomationLog(
      logId,
      AutomationStatus.FAILED,
      undefined,
      error instanceof Error ? error.message : 'Unknown error'
    );

    throw error;
  }
}

async function findProjectsWithMissingHours(options: {
  projectId?: string;
  periodStart: Date;
  periodEnd: Date;
}) {
  // Get active projects
  const projects = await prisma.project.findMany({
    where: {
      ...(options.projectId ? { id: options.projectId } : {}),
      status: 'ACTIVE',
    },
    include: {
      hoursEntries: {
        where: {
          date: {
            gte: options.periodStart,
            lte: options.periodEnd,
          },
        },
        include: {
          user: {
            include: {
              notificationPrefs: true,
            },
          },
        },
      },
    },
  });

  // For each project, find team members who haven't submitted hours
  const projectsWithMissingHours = [];

  for (const project of projects) {
    // Get all team members for this project
    // (You might want to fetch this from Simplicate or maintain a project-user relation)
    const teamMembers = await prisma.user.findMany({
      where: {
        hoursEntries: {
          some: {
            projectId: project.id,
          },
        },
      },
      include: {
        notificationPrefs: true,
      },
    });

    // Find members who haven't submitted hours for this period
    const membersWithMissingHours = teamMembers.filter((member) => {
      const hasSubmittedHours = project.hoursEntries.some(
        (entry) =>
          entry.userId === member.id &&
          entry.status !== 'PENDING'
      );
      return !hasSubmittedHours;
    });

    // Check reminder preferences
    const membersToRemind = membersWithMissingHours.filter((member) => {
      const prefs = member.notificationPrefs;
      if (!prefs) return true; // Default to sending reminders
      return prefs.hoursReminders;
    });

    if (membersToRemind.length > 0) {
      projectsWithMissingHours.push({
        ...project,
        teamMembers: membersToRemind,
      });
    }
  }

  return projectsWithMissingHours;
}

async function sendHoursReminder(options: {
  user: any;
  project: any;
  period: string;
  periodStart: Date;
  periodEnd: Date;
}) {
  const { user, project, period } = options;

  const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const submitUrl = `${appUrl}/workspace/hours/submit?project=${project.id}`;

  await sendNotification({
    userId: user.id,
    type: NotificationType.HOURS_REMINDER,
    title: 'Hours Submission Reminder',
    message: `Please submit your hours for project "${project.name}" for ${period}.`,
    actionUrl: submitUrl,
    metadata: {
      projectId: project.id,
      period,
      periodStart: options.periodStart.toISOString(),
      periodEnd: options.periodEnd.toISOString(),
    },
  });

  console.log('[Hours Reminder] Sent to:', user.email);
}

async function createAutomationLog(projectId?: string) {
  const log = await prisma.automationLog.create({
    data: {
      projectId: projectId || null,
      workflowType: WorkflowType.HOURS_REMINDER,
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
