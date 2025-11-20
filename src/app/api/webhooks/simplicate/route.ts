/**
 * Simplicate Webhook Receiver
 *
 * Handles incoming webhooks from Simplicate
 * Docs: https://developer.simplicate.com/webhooks
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { WorkflowType } from '@prisma/client';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SimplicateWebhookPayload {
  event: string;
  data: {
    id: string;
    [key: string]: any;
  };
  timestamp: string;
}

export async function POST(request: NextRequest) {
  try {
    // Parse webhook payload
    const payload: SimplicateWebhookPayload = await request.json();

    console.log('[Webhook] Received:', {
      event: payload.event,
      id: payload.data?.id,
      timestamp: payload.timestamp,
    });

    // Store webhook event for processing
    const webhookEvent = await prisma.webhookEvent.create({
      data: {
        eventType: payload.event,
        payload: payload as any,
        processed: false,
      },
    });

    // Process webhook based on event type
    await processWebhook(payload, webhookEvent.id);

    return NextResponse.json({
      success: true,
      eventId: webhookEvent.id,
    });
  } catch (error) {
    console.error('[Webhook] Error:', error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

async function processWebhook(
  payload: SimplicateWebhookPayload,
  webhookEventId: string
) {
  try {
    switch (payload.event) {
      case 'project.created':
      case 'project.updated':
        await handleProjectEvent(payload);
        break;

      case 'hours.created':
      case 'hours.updated':
        await handleHoursEvent(payload);
        break;

      case 'invoice.created':
      case 'invoice.updated':
        await handleInvoiceEvent(payload);
        break;

      default:
        console.log('[Webhook] Unhandled event type:', payload.event);
    }

    // Mark webhook as processed
    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        processed: true,
        processedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('[Webhook] Processing error:', error);

    // Store error in webhook event
    await prisma.webhookEvent.update({
      where: { id: webhookEventId },
      data: {
        error: error instanceof Error ? error.message : 'Processing failed',
      },
    });

    throw error;
  }
}

async function handleProjectEvent(payload: SimplicateWebhookPayload) {
  const projectData = payload.data;

  // Check if project exists in our database
  const existingProject = await prisma.project.findUnique({
    where: { simplicateId: projectData.id },
  });

  if (existingProject) {
    // Update existing project
    await prisma.project.update({
      where: { simplicateId: projectData.id },
      data: {
        name: projectData.name || existingProject.name,
        description: projectData.description,
        lastSyncedAt: new Date(),
      },
    });

    console.log('[Webhook] Project updated:', projectData.id);
  } else {
    // Create new project
    const newProject = await prisma.project.create({
      data: {
        simplicateId: projectData.id,
        name: projectData.name || 'Unnamed Project',
        description: projectData.description,
        clientName: projectData.organization?.name,
        projectNumber: projectData.project_number,
        startDate: projectData.start_date ? new Date(projectData.start_date) : null,
        endDate: projectData.end_date ? new Date(projectData.end_date) : null,
        status: 'ACTIVE',
      },
    });

    console.log('[Webhook] Project created:', newProject.id);

    // Trigger contract distribution workflow for new projects
    if (payload.event === 'project.created') {
      await prisma.automationLog.create({
        data: {
          projectId: newProject.id,
          workflowType: WorkflowType.CONTRACT_DISTRIBUTION,
          status: 'PENDING',
        },
      });

      // TODO: Trigger async workflow processing
      console.log('[Webhook] Contract distribution workflow queued');
    }
  }
}

async function handleHoursEvent(payload: SimplicateWebhookPayload) {
  const hoursData = payload.data;

  // Sync hours entry with our database
  const project = await prisma.project.findUnique({
    where: { simplicateId: hoursData.project_id },
  });

  if (!project) {
    console.warn('[Webhook] Project not found for hours entry:', hoursData.project_id);
    return;
  }

  // Check if hours entry exists
  const existingEntry = await prisma.hoursEntry.findUnique({
    where: { simplicateHoursId: hoursData.id },
  });

  if (existingEntry) {
    // Update existing entry
    await prisma.hoursEntry.update({
      where: { simplicateHoursId: hoursData.id },
      data: {
        hours: hoursData.hours,
        date: new Date(hoursData.date),
        description: hoursData.description,
        status: 'SUBMITTED',
      },
    });

    console.log('[Webhook] Hours entry updated:', hoursData.id);
  } else {
    // Create new entry
    const user = await prisma.user.findUnique({
      where: { simplicateEmployeeId: hoursData.employee_id },
    });

    if (user) {
      await prisma.hoursEntry.create({
        data: {
          simplicateHoursId: hoursData.id,
          projectId: project.id,
          userId: user.id,
          hours: hoursData.hours,
          date: new Date(hoursData.date),
          description: hoursData.description,
          hourlyRate: hoursData.hourly_rate,
          status: 'SUBMITTED',
        },
      });

      console.log('[Webhook] Hours entry created:', hoursData.id);
    }
  }
}

async function handleInvoiceEvent(payload: SimplicateWebhookPayload) {
  const invoiceData = payload.data;

  // Sync invoice with our database
  const project = await prisma.project.findUnique({
    where: { simplicateId: invoiceData.project_id },
  });

  if (!project) {
    console.warn('[Webhook] Project not found for invoice:', invoiceData.project_id);
    return;
  }

  // Check if invoice exists
  const existingInvoice = await prisma.invoice.findUnique({
    where: { simplicateInvoiceId: invoiceData.id },
  });

  if (existingInvoice) {
    // Update existing invoice
    await prisma.invoice.update({
      where: { simplicateInvoiceId: invoiceData.id },
      data: {
        invoiceNumber: invoiceData.invoice_number,
        amount: invoiceData.total_excl_vat || existingInvoice.amount,
        status: mapInvoiceStatus(invoiceData.status),
      },
    });

    console.log('[Webhook] Invoice updated:', invoiceData.id);
  } else {
    // Create new invoice
    await prisma.invoice.create({
      data: {
        simplicateInvoiceId: invoiceData.id,
        projectId: project.id,
        invoiceNumber: invoiceData.invoice_number,
        amount: invoiceData.total_excl_vat || 0,
        periodStart: new Date(invoiceData.date || Date.now()),
        periodEnd: new Date(invoiceData.date || Date.now()),
        status: mapInvoiceStatus(invoiceData.status),
      },
    });

    console.log('[Webhook] Invoice created:', invoiceData.id);
  }
}

function mapInvoiceStatus(simplicateStatus: string): any {
  const statusMap: Record<string, any> = {
    draft: 'DRAFT',
    pending: 'PENDING_APPROVAL',
    approved: 'APPROVED',
    sent: 'SENT',
    paid: 'PAID',
    cancelled: 'CANCELLED',
  };

  return statusMap[simplicateStatus?.toLowerCase()] || 'DRAFT';
}

// Verify webhook signature (if Simplicate provides one)
function verifyWebhookSignature(request: NextRequest): boolean {
  // TODO: Implement signature verification if Simplicate supports it
  // const signature = request.headers.get('x-simplicate-signature');
  // Verify signature here
  return true;
}
