/**
 * Email Service using Resend
 */

import { Resend } from 'resend';
import { env } from '@/env';

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
  }>;
}

export async function sendEmail(options: EmailOptions) {
  if (!resend) {
    console.warn('[Email] Resend not configured, skipping email send');
    return { success: false, error: 'Email service not configured' };
  }

  try {
    const result = await resend.emails.send({
      from: options.from || env.EMAIL_FROM,
      to: Array.isArray(options.to) ? options.to : [options.to],
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    });

    console.log('[Email] Sent successfully:', result.data?.id);

    return { success: true, messageId: result.data?.id };
  } catch (error) {
    console.error('[Email] Send error:', error);
    throw error;
  }
}

export async function sendContractEmail(options: {
  to: string;
  userName: string;
  projectName: string;
  contractUrl: string;
  uploadUrl: string;
}) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 40px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background: #ffffff;
            padding: 40px;
            border: 1px solid #e2e8f0;
            border-top: none;
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
            padding: 20px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            color: #718096;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin: 0; font-size: 28px;">Contract Required</h1>
        </div>
        <div class="content">
          <p>Hi ${options.userName},</p>

          <p>You've been assigned to a new project and need to sign a contract to get started.</p>

          <div class="info-box">
            <strong>Project:</strong> ${options.projectName}<br>
            <strong>Action Required:</strong> Review and sign the attached contract
          </div>

          <h3>Next Steps:</h3>
          <ol>
            <li>Download and review the contract template</li>
            <li>Sign the contract</li>
            <li>Upload the signed document using the link below</li>
          </ol>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${options.contractUrl}" class="button">Download Contract</a>
            <a href="${options.uploadUrl}" class="button secondary">Upload Signed Contract</a>
          </div>

          <p style="font-size: 14px; color: #718096; margin-top: 30px;">
            If you have any questions, please contact your project manager.
          </p>
        </div>
        <div class="footer">
          <p>Simplicate Automation System</p>
          <p>This is an automated message, please do not reply.</p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: options.to,
    subject: `Contract Required: ${options.projectName}`,
    html,
  });
}

export async function sendHoursReminderEmail(options: {
  to: string;
  userName: string;
  projectName: string;
  period: string;
  submitUrl: string;
}) {
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            padding: 40px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background: #ffffff;
            padding: 40px;
            border: 1px solid #e2e8f0;
            border-top: none;
          }
          .button {
            display: inline-block;
            padding: 14px 28px;
            background: #f5576c;
            color: white !important;
            text-decoration: none;
            border-radius: 6px;
            margin: 20px 0;
            font-weight: 600;
          }
          .info-box {
            background: #fff5f5;
            border-left: 4px solid #f5576c;
            padding: 20px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            color: #718096;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 style="margin: 0; font-size: 28px;">Hours Submission Reminder</h1>
        </div>
        <div class="content">
          <p>Hi ${options.userName},</p>

          <p>This is a friendly reminder to submit your hours for the following project:</p>

          <div class="info-box">
            <strong>Project:</strong> ${options.projectName}<br>
            <strong>Period:</strong> ${options.period}<br>
            <strong>Status:</strong> Pending submission
          </div>

          <p>Please submit your hours as soon as possible to ensure accurate billing and project tracking.</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${options.submitUrl}" class="button">Submit Hours Now</a>
          </div>

          <p style="font-size: 14px; color: #718096; margin-top: 30px;">
            If you've already submitted your hours, you can disregard this message.
          </p>
        </div>
        <div class="footer">
          <p>Simplicate Automation System</p>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: options.to,
    subject: `Hours Reminder: ${options.projectName} - ${options.period}`,
    html,
  });
}
