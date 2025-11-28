/**
 * Inbound Email Webhook
 *
 * Receives emails from SendGrid Inbound Parse and processes them.
 * https://docs.sendgrid.com/for-developers/parsing-email/setting-up-the-inbound-parse-webhook
 *
 * This endpoint:
 * 1. Parses the multipart form data from SendGrid
 * 2. Classifies the email (invoice/contract/other)
 * 3. Extracts attachments
 * 4. For invoices: runs OCR and creates draft invoice
 * 5. For contracts: stores for manual processing
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { db } from '@/server/db';
import { classifyEmail, extractProjectReference } from '@/lib/email/classifier';
import { extractInvoiceData } from '@/lib/email/invoice-ocr';

export const runtime = 'nodejs';
export const maxDuration = 60; // 60 seconds for OCR processing

/**
 * Parse attachment from SendGrid format
 */
interface ParsedAttachment {
  filename: string;
  contentType: string;
  size: number;
  data: Buffer;
}

async function parseAttachments(
  formData: FormData,
): Promise<ParsedAttachment[]> {
  const attachments: ParsedAttachment[] = [];

  // SendGrid sends attachments as individual form fields
  // with names like "attachment1", "attachment2", etc.
  let index = 1;
  while (true) {
    const attachmentKey = `attachment${index}`;
    const file = formData.get(attachmentKey);

    if (!file || !(file instanceof File)) {
      break; // No more attachments
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    attachments.push({
      filename: file.name || `attachment${index}`,
      contentType: file.type || 'application/octet-stream',
      size: buffer.length,
      data: buffer,
    });

    index++;
  }

  // Also check for "attachmentN" format with info fields
  for (const [key, value] of formData.entries()) {
    if (key.startsWith('attachment-info')) {
      // SendGrid also sends attachment info separately
      // We've already processed the main attachments above
      continue;
    }
  }

  return attachments;
}

/**
 * POST /api/email/inbound
 *
 * Webhook endpoint for SendGrid Inbound Parse
 */
export async function POST(request: NextRequest) {
  try {
    // Parse form data
    const formData = await request.formData();

    // Extract email fields
    const from = formData.get('from') as string;
    const to = formData.get('to') as string;
    const subject = formData.get('subject') as string;
    const text = formData.get('text') as string;
    const html = formData.get('html') as string;

    if (!from || !to || !subject) {
      return NextResponse.json(
        { error: 'Missing required email fields' },
        { status: 400 },
      );
    }

    console.log(`[Inbound Email] From: ${from}, To: ${to}, Subject: ${subject}`);

    // Parse attachments
    const attachments = await parseAttachments(formData);
    console.log(`[Inbound Email] Found ${attachments.length} attachments`);

    // Classify email
    const classification = await classifyEmail(
      to,
      subject,
      text || html || '',
      attachments.map((a) => a.filename),
    );

    console.log(
      `[Inbound Email] Classified as ${classification.type} (by ${classification.classifiedBy})`,
    );

    // Store email in database
    const email = await db.inboundEmail.create({
      data: {
        from,
        to,
        subject,
        body: text || html,
        type: classification.type,
        classifiedBy: classification.classifiedBy,
        processed: false,
        attachments: {
          create: attachments.map((att) => ({
            filename: att.filename,
            contentType: att.contentType,
            size: att.size,
            data: Buffer.from(att.data),
          })),
        },
      },
      include: {
        attachments: true,
      },
    });

    console.log(`[Inbound Email] Saved to database: ${email.id}`);

    // Process based on type
    if (classification.type === 'INVOICE') {
      await processInvoiceEmail(email.id, attachments, from, subject, text);
    } else if (classification.type === 'CONTRACT') {
      await processContractEmail(email.id, attachments);
    }

    // Mark as processed
    await db.inboundEmail.update({
      where: { id: email.id },
      data: { processed: true, processedAt: new Date() },
    });

    return NextResponse.json({
      success: true,
      emailId: email.id,
      type: classification.type,
    });
  } catch (error) {
    console.error('[Inbound Email] Error:', error);

    return NextResponse.json(
      {
        error: 'Failed to process email',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

/**
 * Process an invoice email
 * - Run OCR on PDF/image attachments
 * - Create draft purchasing invoice
 * - Link to project if found
 */
async function processInvoiceEmail(
  emailId: string,
  attachments: ParsedAttachment[],
  from: string,
  subject: string,
  body: string,
) {
  try {
    // Find the first PDF or image attachment
    const invoiceAttachment = attachments.find((att) =>
      [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
      ].includes(att.contentType.toLowerCase()),
    );

    if (!invoiceAttachment) {
      console.log('[Invoice Processing] No PDF/image attachment found');
      await db.inboundEmail.update({
        where: { id: emailId },
        data: {
          error:
            'Email classified as invoice but no PDF/image attachment found',
        },
      });
      return;
    }

    console.log(
      `[Invoice Processing] Running OCR on ${invoiceAttachment.filename}`,
    );

    // Run OCR
    const ocrResult = await extractInvoiceData(
      invoiceAttachment.data,
      invoiceAttachment.contentType,
      invoiceAttachment.filename,
    );

    if (!ocrResult.success || !ocrResult.data) {
      console.error('[Invoice Processing] OCR failed:', ocrResult.error);
      await db.inboundEmail.update({
        where: { id: emailId },
        data: { error: `OCR failed: ${ocrResult.error}` },
      });
      return;
    }

    console.log('[Invoice Processing] OCR successful:', {
      confidence: ocrResult.confidence,
      invoiceNumber: ocrResult.data.invoiceNumber,
      total: ocrResult.data.total,
    });

    // Try to find project
    const projectRef = extractProjectReference(subject, body);
    let projectId: string | undefined;

    if (projectRef) {
      const project = await db.project.findFirst({
        where: {
          OR: [
            { projectNumber: projectRef },
            { name: { contains: projectRef, mode: 'insensitive' } },
          ],
        },
      });
      if (project) {
        projectId = project.id;
        console.log(`[Invoice Processing] Linked to project: ${project.name}`);
      }
    }

    // Find a default employee (admin) for now
    // In production, you might want to assign to a specific person
    const adminUser = await db.user.findFirst({
      where: { role: 'ADMIN' },
    });

    if (!adminUser) {
      console.error('[Invoice Processing] No admin user found');
      await db.inboundEmail.update({
        where: { id: emailId },
        data: { error: 'No admin user found to assign invoice' },
      });
      return;
    }

    // Use project if found, otherwise use first project (or create a "General" project)
    let finalProjectId = projectId;
    if (!finalProjectId) {
      const firstProject = await db.project.findFirst();
      if (firstProject) {
        finalProjectId = firstProject.id;
      } else {
        console.error('[Invoice Processing] No projects found in database');
        await db.inboundEmail.update({
          where: { id: emailId },
          data: { error: 'No project found to link invoice' },
        });
        return;
      }
    }

    // Create draft purchasing invoice
    const invoice = await db.purchasingInvoice.create({
      data: {
        projectId: finalProjectId,
        userId: adminUser.id,

        // Use OCR data
        periodStart: ocrResult.data.invoiceDate
          ? new Date(ocrResult.data.invoiceDate)
          : new Date(),
        periodEnd: ocrResult.data.dueDate
          ? new Date(ocrResult.data.dueDate)
          : new Date(),

        // Default hours data (can be edited manually)
        totalHours: 0,
        hourlyRate: 0,
        hoursAmount: 0,

        // Financial data from OCR
        subtotal: ocrResult.data.subtotal || 0,
        vatRate: ocrResult.data.vatRate || null,
        vatAmount: ocrResult.data.vatAmount || null,
        total: ocrResult.data.total || 0,

        // OCR tracking
        sourceEmailId: emailId,
        ocrData: ocrResult.data as any,
        ocrConfidence: ocrResult.confidence,
        needsReview: true,

        status: 'DRAFT',
      },
    });

    console.log(`[Invoice Processing] Created draft invoice: ${invoice.id}`);

    // TODO: Send notification to admin for review
  } catch (error) {
    console.error('[Invoice Processing] Error:', error);
    await db.inboundEmail.update({
      where: { id: emailId },
      data: {
        error: `Processing error: ${error instanceof Error ? error.message : 'Unknown'}`,
      },
    });
  }
}

/**
 * Process a contract email
 * - Store attachments for manual review
 * - Create notification
 */
async function processContractEmail(
  emailId: string,
  attachments: ParsedAttachment[],
) {
  try {
    console.log(
      `[Contract Processing] Stored ${attachments.length} contract attachments`,
    );

    // For now, just log. In the future:
    // - Link to specific project
    // - Create document request
    // - Notify relevant person

    // TODO: Implement contract processing
  } catch (error) {
    console.error('[Contract Processing] Error:', error);
    await db.inboundEmail.update({
      where: { id: emailId },
      data: {
        error: `Contract processing error: ${error instanceof Error ? error.message : 'Unknown'}`,
      },
    });
  }
}
