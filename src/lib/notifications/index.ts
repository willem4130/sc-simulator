/**
 * Multi-Channel Notification System
 *
 * Sends notifications via Email, Slack, and In-App
 */

import { NotificationType, NotificationChannel } from '@prisma/client';
import { prisma } from '@/lib/db';
import { sendEmail } from './email';
import { sendSlackMessage } from './slack';

export interface NotificationOptions {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
  channels?: NotificationChannel[];
}

export async function sendNotification(options: NotificationOptions) {
  try {
    // Get user preferences
    const user = await prisma.user.findUnique({
      where: { id: options.userId },
      include: { notificationPrefs: true },
    });

    if (!user) {
      throw new Error(`User not found: ${options.userId}`);
    }

    // Determine which channels to use
    let channels = options.channels;

    if (!channels) {
      // Use user preferences
      channels = [];
      const prefs = user.notificationPrefs;

      if (prefs) {
        if (prefs.emailEnabled) channels.push(NotificationChannel.EMAIL);
        if (prefs.slackEnabled) channels.push(NotificationChannel.SLACK);
        if (prefs.inAppEnabled) channels.push(NotificationChannel.IN_APP);
      } else {
        // Default to email and in-app if no preferences set
        channels = [NotificationChannel.EMAIL, NotificationChannel.IN_APP];
      }
    }

    // Create in-app notification
    const notification = await prisma.notification.create({
      data: {
        userId: options.userId,
        type: options.type,
        title: options.title,
        message: options.message,
        actionUrl: options.actionUrl,
        channels,
        metadata: options.metadata,
      },
    });

    // Send via different channels
    const results = await Promise.allSettled([
      channels.includes(NotificationChannel.EMAIL) && user.email
        ? sendEmail({
            to: user.email,
            subject: options.title,
            html: formatEmailTemplate(options),
          })
        : Promise.resolve(),

      channels.includes(NotificationChannel.SLACK) &&
      user.notificationPrefs?.slackUserId
        ? sendSlackMessage({
            userId: user.notificationPrefs.slackUserId,
            text: options.title,
            blocks: formatSlackBlocks(options),
          })
        : Promise.resolve(),
    ]);

    // Mark notification as sent
    await prisma.notification.update({
      where: { id: notification.id },
      data: { sentAt: new Date() },
    });

    // Check for errors
    const errors = results
      .map((result, index) => {
        if (result.status === 'rejected') {
          return `${channels[index]}: ${result.reason}`;
        }
        return null;
      })
      .filter(Boolean);

    if (errors.length > 0) {
      console.error('[Notifications] Partial failure:', errors);
    }

    return {
      success: true,
      notificationId: notification.id,
      errors: errors.length > 0 ? errors : undefined,
    };
  } catch (error) {
    console.error('[Notifications] Error:', error);
    throw error;
  }
}

export async function sendBulkNotifications(
  userIds: string[],
  options: Omit<NotificationOptions, 'userId'>
) {
  const results = await Promise.allSettled(
    userIds.map((userId) =>
      sendNotification({
        ...options,
        userId,
      })
    )
  );

  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  const failed = results.filter((r) => r.status === 'rejected').length;

  return {
    total: userIds.length,
    succeeded,
    failed,
    results,
  };
}

export async function markNotificationAsRead(notificationId: string) {
  return prisma.notification.update({
    where: { id: notificationId },
    data: { readAt: new Date() },
  });
}

export async function getUserNotifications(
  userId: string,
  options?: {
    unreadOnly?: boolean;
    limit?: number;
    offset?: number;
  }
) {
  return prisma.notification.findMany({
    where: {
      userId,
      ...(options?.unreadOnly ? { readAt: null } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: options?.limit || 50,
    skip: options?.offset || 0,
  });
}

// Template formatters

function formatEmailTemplate(options: NotificationOptions): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 8px 8px 0 0;
            text-align: center;
          }
          .content {
            background: #ffffff;
            padding: 30px;
            border: 1px solid #e2e8f0;
            border-top: none;
          }
          .button {
            display: inline-block;
            padding: 12px 24px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            margin-top: 20px;
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
          <h1 style="margin: 0;">${options.title}</h1>
        </div>
        <div class="content">
          <p>${options.message}</p>
          ${
            options.actionUrl
              ? `<a href="${options.actionUrl}" class="button">Take Action</a>`
              : ''
          }
        </div>
        <div class="footer">
          <p>Simplicate Automation System</p>
        </div>
      </body>
    </html>
  `;
}

function formatSlackBlocks(options: NotificationOptions) {
  const blocks: any[] = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: options.title,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: options.message,
      },
    },
  ];

  if (options.actionUrl) {
    blocks.push({
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Take Action',
          },
          url: options.actionUrl,
          style: 'primary',
        },
      ],
    });
  }

  return blocks;
}
