/**
 * Email Service for Database-backed Templates
 * Uses Resend for sending and Prisma for template/tracking storage
 */

import { Resend } from 'resend';
import { env } from '@/env';
import { db } from '@/server/db';
import { substituteVariables, type VariableContext } from './variables';
import type { EmailTemplate, Project, User } from '@prisma/client';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export interface SendEmailOptions {
  templateId: string;
  recipient: {
    userId: string;
    email: string;
    name?: string | null;
  };
  project?: Pick<Project, 'id' | 'name' | 'projectNumber' | 'clientName' | 'simplicateId'> | null;
  customVariables?: Record<string, string>;
  uploadUrl?: string;
}

export interface SendEmailResult {
  success: boolean;
  sentEmailId?: string;
  resendId?: string;
  error?: string;
}

// Base email template wrapper with consistent styling
function wrapInEmailTemplate(content: string, headerTitle?: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
          }
          .wrapper {
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          ${headerTitle ? `
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px 40px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: 600;
          }
          ` : ''}
          .content {
            background: #ffffff;
            padding: 40px;
            border: 1px solid #e2e8f0;
            ${headerTitle ? 'border-top: none;' : 'border-radius: 8px;'}
            ${!headerTitle ? 'border-radius: 8px;' : 'border-radius: 0 0 8px 8px;'}
          }
          .button {
            display: inline-block;
            padding: 14px 28px;
            background: #667eea;
            color: white !important;
            text-decoration: none;
            border-radius: 6px;
            margin: 10px 5px;
            font-weight: 600;
          }
          .button.secondary {
            background: #48bb78;
          }
          .info-box {
            background: #f7fafc;
            border-left: 4px solid #667eea;
            padding: 15px 20px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 20px;
            color: #718096;
            font-size: 12px;
          }
          a {
            color: #667eea;
          }
          p {
            margin: 0 0 16px 0;
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          ${headerTitle ? `<div class="header"><h1>${headerTitle}</h1></div>` : ''}
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>Simplicate Automation System</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

// Send email using a database template
export async function sendTemplatedEmail(options: SendEmailOptions): Promise<SendEmailResult> {
  // Get the template
  const template = await db.emailTemplate.findUnique({
    where: { id: options.templateId },
  });

  if (!template) {
    return { success: false, error: 'Template not found' };
  }

  if (!template.isActive) {
    return { success: false, error: 'Template is inactive' };
  }

  // Build variable context
  const context: VariableContext = {
    user: {
      name: options.recipient.name || null,
      email: options.recipient.email,
    },
    project: options.project || null,
    custom: options.customVariables,
  };

  const appUrl = env.NEXTAUTH_URL || 'https://simplicate-automations.vercel.app';

  // Substitute variables in subject and body
  const renderedSubject = substituteVariables(template.subject, context, {
    appUrl,
    uploadUrl: options.uploadUrl,
  });

  const renderedBody = substituteVariables(template.bodyHtml, context, {
    appUrl,
    uploadUrl: options.uploadUrl,
  });

  // Wrap body in email template
  const fullHtml = wrapInEmailTemplate(renderedBody);

  // Create SentEmail record first (PENDING status)
  const sentEmail = await db.sentEmail.create({
    data: {
      templateId: template.id,
      projectId: options.project?.id || null,
      userId: options.recipient.userId,
      toEmail: options.recipient.email,
      subject: renderedSubject,
      status: 'PENDING',
    },
  });

  // Check if Resend is configured
  if (!resend) {
    console.warn('[Email] Resend not configured, marking as failed');
    await db.sentEmail.update({
      where: { id: sentEmail.id },
      data: {
        status: 'FAILED',
        error: 'Email service not configured',
      },
    });
    return {
      success: false,
      sentEmailId: sentEmail.id,
      error: 'Email service not configured',
    };
  }

  // Send via Resend
  try {
    const result = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: [options.recipient.email],
      subject: renderedSubject,
      html: fullHtml,
      replyTo: env.EMAIL_REPLY_TO,
    });

    // Update SentEmail with success
    await db.sentEmail.update({
      where: { id: sentEmail.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        resendId: result.data?.id || null,
      },
    });

    console.log(`[Email] Sent successfully to ${options.recipient.email}:`, result.data?.id);

    return {
      success: true,
      sentEmailId: sentEmail.id,
      resendId: result.data?.id || undefined,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Email] Send error:', error);

    // Update SentEmail with failure
    await db.sentEmail.update({
      where: { id: sentEmail.id },
      data: {
        status: 'FAILED',
        error: errorMessage,
      },
    });

    return {
      success: false,
      sentEmailId: sentEmail.id,
      error: errorMessage,
    };
  }
}

// Send email to multiple recipients
export async function sendBulkTemplatedEmail(
  templateId: string,
  recipients: Array<{
    userId: string;
    email: string;
    name?: string | null;
    customVariables?: Record<string, string>;
  }>,
  project?: Pick<Project, 'id' | 'name' | 'projectNumber' | 'clientName' | 'simplicateId'> | null,
  baseUploadUrl?: string
): Promise<{
  total: number;
  success: number;
  failed: number;
  results: SendEmailResult[];
}> {
  const results: SendEmailResult[] = [];

  for (const recipient of recipients) {
    // Each recipient can have their own upload URL (with unique token)
    const result = await sendTemplatedEmail({
      templateId,
      recipient,
      project,
      customVariables: recipient.customVariables,
      uploadUrl: baseUploadUrl,
    });
    results.push(result);
  }

  const success = results.filter((r) => r.success).length;

  return {
    total: recipients.length,
    success,
    failed: recipients.length - success,
    results,
  };
}

// Get default Dutch contract reminder template HTML
export function getDefaultContractReminderHtml(): string {
  return `<p>Beste {{memberFirstName}},</p>

<p>Je bent toegevoegd aan het project <strong>"{{projectName}}"</strong> voor {{clientName}}.</p>

<p>Voordat je kunt beginnen, hebben we je getekende contract nodig.</p>

<div class="info-box">
  <strong>Project:</strong> {{projectName}}<br>
  <strong>Klant:</strong> {{clientName}}<br>
  <strong>Actie vereist:</strong> Upload je getekende contract
</div>

<p>Je kunt je contract uploaden via een van de volgende opties:</p>

<div style="text-align: center; margin: 30px 0;">
  <a href="{{uploadUrl}}" class="button">Upload via Portal</a>
  <a href="{{simplicateUrl}}" class="button secondary">Open in Simplicate</a>
</div>

<p style="font-size: 14px; color: #718096;">
  Heb je vragen? Neem dan contact met ons op.
</p>

<p>Met vriendelijke groet,<br>Het team</p>`;
}

// Get default contract reminder subject
export function getDefaultContractReminderSubject(): string {
  return 'Contract vereist voor {{projectName}}';
}

// Hours Report Email Types
export interface HoursReportEmailData {
  employee: {
    id: string;
    name: string | null;
    email: string;
  };
  period: {
    label: string;
  };
  hours: {
    byProject: Array<{
      projectName: string;
      clientName: string | null;
      totalHours: number;
      hourlyRate: number | null;
      totalAmount: number | null;
    }>;
    totalHours: number;
    totalAmount: number | null;
  };
  kilometers: {
    totalKm: number;
    kmRate: number;
    totalAmount: number;
  };
  expenses: {
    totalAmount: number;
  };
  totals: {
    hoursAmount: number | null;
    kmAmount: number;
    expensesAmount: number;
    grandTotal: number | null;
  };
}

// Format currency for email
function formatCurrencyEmail(amount: number): string {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

// Generate hours report email HTML
export function generateHoursReportEmailHtml(data: HoursReportEmailData): string {
  const employeeName = data.employee.name || data.employee.email;

  // Build hours table rows
  const hoursRows = data.hours.byProject.map(project => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0;">
        <strong>${project.projectName}</strong>
        ${project.clientName ? `<br><span style="color: #718096; font-size: 12px;">${project.clientName}</span>` : ''}
      </td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${project.totalHours.toFixed(1)}u</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${project.hourlyRate ? formatCurrencyEmail(project.hourlyRate) + '/u' : '-'}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: 600;">${project.totalAmount ? formatCurrencyEmail(project.totalAmount) : '-'}</td>
    </tr>
  `).join('');

  return `
    <p>Beste ${employeeName},</p>

    <p>Hierbij ontvang je het urenoverzicht voor <strong>${data.period.label}</strong>.</p>

    <h3 style="margin-top: 30px; margin-bottom: 15px; color: #333;">Uren per Project</h3>
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
      <thead>
        <tr style="background: #f7fafc;">
          <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e2e8f0;">Project</th>
          <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e2e8f0;">Uren</th>
          <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e2e8f0;">Tarief</th>
          <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e2e8f0;">Bedrag</th>
        </tr>
      </thead>
      <tbody>
        ${hoursRows}
        <tr style="background: #f7fafc; font-weight: bold;">
          <td style="padding: 10px;">Totaal Uren</td>
          <td style="padding: 10px; text-align: right;">${data.hours.totalHours.toFixed(1)}u</td>
          <td style="padding: 10px;"></td>
          <td style="padding: 10px; text-align: right;">${data.hours.totalAmount ? formatCurrencyEmail(data.hours.totalAmount) : '-'}</td>
        </tr>
      </tbody>
    </table>

    ${data.kilometers.totalKm > 0 ? `
    <h3 style="margin-top: 30px; margin-bottom: 15px; color: #333;">Kilometers</h3>
    <div class="info-box">
      <strong>${data.kilometers.totalKm} km</strong> x ${formatCurrencyEmail(data.kilometers.kmRate)}/km = <strong>${formatCurrencyEmail(data.kilometers.totalAmount)}</strong>
    </div>
    ` : ''}

    ${data.expenses.totalAmount > 0 ? `
    <h3 style="margin-top: 30px; margin-bottom: 15px; color: #333;">Onkosten</h3>
    <div class="info-box">
      Totaal: <strong>${formatCurrencyEmail(data.expenses.totalAmount)}</strong>
    </div>
    ` : ''}

    <div style="background: #667eea; color: white; padding: 20px; border-radius: 8px; margin-top: 30px;">
      <h3 style="margin: 0 0 15px 0; color: white;">Totaaloverzicht</h3>
      <table style="width: 100%; color: white;">
        <tr>
          <td style="padding: 5px 0;">Uren</td>
          <td style="padding: 5px 0; text-align: right;">${data.totals.hoursAmount ? formatCurrencyEmail(data.totals.hoursAmount) : '-'}</td>
        </tr>
        ${data.totals.kmAmount > 0 ? `
        <tr>
          <td style="padding: 5px 0;">Kilometers</td>
          <td style="padding: 5px 0; text-align: right;">${formatCurrencyEmail(data.totals.kmAmount)}</td>
        </tr>
        ` : ''}
        ${data.totals.expensesAmount > 0 ? `
        <tr>
          <td style="padding: 5px 0;">Onkosten</td>
          <td style="padding: 5px 0; text-align: right;">${formatCurrencyEmail(data.totals.expensesAmount)}</td>
        </tr>
        ` : ''}
        <tr style="border-top: 1px solid rgba(255,255,255,0.3);">
          <td style="padding: 10px 0 0 0; font-size: 18px; font-weight: bold;">Totaal</td>
          <td style="padding: 10px 0 0 0; text-align: right; font-size: 18px; font-weight: bold;">${data.totals.grandTotal ? formatCurrencyEmail(data.totals.grandTotal) : '-'}</td>
        </tr>
      </table>
    </div>

    <p style="margin-top: 30px; color: #718096; font-size: 14px;">
      Dit is een automatisch gegenereerd overzicht. Neem contact op als je vragen hebt.
    </p>

    <p>Met vriendelijke groet,<br>Het team</p>
  `;
}

// Send hours report email directly (without template)
export async function sendHoursReportEmail(
  recipient: { userId: string; email: string; name: string | null },
  reportData: HoursReportEmailData
): Promise<SendEmailResult> {
  const subject = `Urenoverzicht ${reportData.period.label}`;
  const bodyHtml = generateHoursReportEmailHtml(reportData);
  const fullHtml = wrapInEmailTemplate(bodyHtml, `Urenoverzicht ${reportData.period.label}`);

  // Create SentEmail record first (PENDING status)
  const sentEmail = await db.sentEmail.create({
    data: {
      templateId: null, // No template, direct send
      projectId: null,
      userId: recipient.userId,
      toEmail: recipient.email,
      subject,
      status: 'PENDING',
    },
  });

  // Check if Resend is configured
  if (!resend) {
    console.warn('[Email] Resend not configured, marking as failed');
    await db.sentEmail.update({
      where: { id: sentEmail.id },
      data: {
        status: 'FAILED',
        error: 'Email service not configured',
      },
    });
    return {
      success: false,
      sentEmailId: sentEmail.id,
      error: 'Email service not configured',
    };
  }

  // Send via Resend
  try {
    const result = await resend.emails.send({
      from: env.EMAIL_FROM,
      to: [recipient.email],
      subject,
      html: fullHtml,
      replyTo: env.EMAIL_REPLY_TO,
    });

    console.log('[Email] Resend API response:', JSON.stringify(result, null, 2));

    // Update SentEmail with success
    await db.sentEmail.update({
      where: { id: sentEmail.id },
      data: {
        status: 'SENT',
        sentAt: new Date(),
        resendId: result.data?.id || null,
      },
    });

    console.log(`[Email] Hours report sent successfully to ${recipient.email}:`, result.data?.id);

    return {
      success: true,
      sentEmailId: sentEmail.id,
      resendId: result.data?.id || undefined,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Email] Send hours report error:', error);

    // Update SentEmail with failure
    await db.sentEmail.update({
      where: { id: sentEmail.id },
      data: {
        status: 'FAILED',
        error: errorMessage,
      },
    });

    return {
      success: false,
      sentEmailId: sentEmail.id,
      error: errorMessage,
    };
  }
}
