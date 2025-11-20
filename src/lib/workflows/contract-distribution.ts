/**
 * Contract Distribution Workflow
 *
 * Triggered when a new project is created
 * Sends contract templates to all assigned team members
 */

import { prisma } from '@/lib/db';
import { getSimplicateClient } from '@/lib/simplicate';
import { sendNotification } from '@/lib/notifications';
import { NotificationType, WorkflowType, AutomationStatus } from '@prisma/client';
import crypto from 'crypto';

export interface ContractDistributionOptions {
  projectId: string;
  templateName?: string;
  templateUrl?: string;
}

export async function runContractDistribution(options: ContractDistributionOptions) {
  const logId = await createAutomationLog(options.projectId);

  try {
    console.log('[Contract Distribution] Starting for project:', options.projectId);

    // Update log status
    await updateAutomationLog(logId, AutomationStatus.RUNNING);

    // Get project details
    const project = await prisma.project.findUnique({
      where: { id: options.projectId },
    });

    if (!project) {
      throw new Error(`Project not found: ${options.projectId}`);
    }

    // Get team members from Simplicate
    const simplicateClient = getSimplicateClient();
    const employees = await simplicateClient.getProjectEmployees(project.simplicateId);

    console.log('[Contract Distribution] Found team members:', employees.length);

    if (employees.length === 0) {
      console.warn('[Contract Distribution] No team members found');
      await updateAutomationLog(logId, AutomationStatus.SUCCESS, {
        message: 'No team members to notify',
      });
      return { success: true, contractsCreated: 0 };
    }

    // Process each team member
    const results = await Promise.allSettled(
      employees.map((employee) =>
        processTeamMember({
          project,
          employee,
          templateName: options.templateName || 'Standard Contract',
          templateUrl: options.templateUrl,
        })
      )
    );

    // Count successes and failures
    const succeeded = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    console.log('[Contract Distribution] Completed:', { succeeded, failed });

    await updateAutomationLog(logId, AutomationStatus.SUCCESS, {
      total: employees.length,
      succeeded,
      failed,
    });

    return {
      success: true,
      contractsCreated: succeeded,
      errors: failed > 0 ? results.filter((r) => r.status === 'rejected') : undefined,
    };
  } catch (error) {
    console.error('[Contract Distribution] Error:', error);

    await updateAutomationLog(
      logId,
      AutomationStatus.FAILED,
      undefined,
      error instanceof Error ? error.message : 'Unknown error'
    );

    throw error;
  }
}

async function processTeamMember(options: {
  project: any;
  employee: any;
  templateName: string;
  templateUrl?: string;
}) {
  const { project, employee, templateName, templateUrl } = options;

  // Find or create user
  let user = await prisma.user.findUnique({
    where: { simplicateEmployeeId: employee.id },
  });

  if (!user && employee.email) {
    // Create user if doesn't exist
    user = await prisma.user.create({
      data: {
        email: employee.email,
        name: employee.name,
        simplicateEmployeeId: employee.id,
        role: 'TEAM_MEMBER',
      },
    });

    console.log('[Contract Distribution] Created user:', user.id);
  }

  if (!user) {
    console.warn('[Contract Distribution] Could not create user for employee:', employee.id);
    return;
  }

  // Generate secure upload token
  const uploadToken = crypto.randomBytes(32).toString('hex');

  // Create contract record
  const contract = await prisma.contract.create({
    data: {
      projectId: project.id,
      userId: user.id,
      templateName,
      templateUrl,
      uploadToken,
      status: 'PENDING',
    },
  });

  // Generate URLs
  const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const contractUrl = templateUrl || `${appUrl}/api/contracts/${contract.id}/template`;
  const uploadUrl = `${appUrl}/workspace/contracts/${contract.id}/upload?token=${uploadToken}`;

  // Send notification
  await sendNotification({
    userId: user.id,
    type: NotificationType.CONTRACT_ASSIGNED,
    title: 'Contract Required',
    message: `You've been assigned to project "${project.name}" and need to sign a contract.`,
    actionUrl: uploadUrl,
    metadata: {
      projectId: project.id,
      contractId: contract.id,
      contractUrl,
      uploadUrl,
    },
  });

  // Update contract status to SENT
  await prisma.contract.update({
    where: { id: contract.id },
    data: {
      status: 'SENT',
      sentAt: new Date(),
    },
  });

  console.log('[Contract Distribution] Contract sent:', contract.id);

  return contract;
}

async function createAutomationLog(projectId: string) {
  const log = await prisma.automationLog.create({
    data: {
      projectId,
      workflowType: WorkflowType.CONTRACT_DISTRIBUTION,
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
