/**
 * Slack Service
 */

import { WebClient } from '@slack/web-api';
import { env } from '@/env';

const slack = env.SLACK_BOT_TOKEN ? new WebClient(env.SLACK_BOT_TOKEN) : null;

export interface SlackMessageOptions {
  userId?: string;
  channel?: string;
  text: string;
  blocks?: any[];
}

export async function sendSlackMessage(options: SlackMessageOptions) {
  if (!slack) {
    console.warn('[Slack] Not configured, skipping Slack message');
    return { success: false, error: 'Slack not configured' };
  }

  try {
    let channel = options.channel;

    // If userId provided, open DM channel
    if (options.userId) {
      const result = await slack.conversations.open({
        users: options.userId,
      });
      channel = result.channel?.id;
    }

    if (!channel) {
      throw new Error('No channel or userId provided');
    }

    const result = await slack.chat.postMessage({
      channel,
      text: options.text,
      blocks: options.blocks,
    });

    console.log('[Slack] Message sent:', result.ts);

    return { success: true, messageId: result.ts };
  } catch (error) {
    console.error('[Slack] Send error:', error);
    throw error;
  }
}

export async function sendContractSlackNotification(options: {
  userId: string;
  projectName: string;
  contractUrl: string;
  uploadUrl: string;
}) {
  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '📋 Contract Required',
        emoji: true,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `You've been assigned to *${options.projectName}* and need to sign a contract.`,
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Download Contract',
            emoji: true,
          },
          url: options.contractUrl,
          style: 'primary',
        },
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Upload Signed Contract',
            emoji: true,
          },
          url: options.uploadUrl,
          style: 'primary',
        },
      ],
    },
  ];

  return sendSlackMessage({
    userId: options.userId,
    text: `Contract Required: ${options.projectName}`,
    blocks,
  });
}

export async function sendHoursReminderSlack(options: {
  userId: string;
  projectName: string;
  period: string;
  submitUrl: string;
}) {
  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: '⏰ Hours Submission Reminder',
        emoji: true,
      },
    },
    {
      type: 'section',
      fields: [
        {
          type: 'mrkdwn',
          text: `*Project:*\n${options.projectName}`,
        },
        {
          type: 'mrkdwn',
          text: `*Period:*\n${options.period}`,
        },
      ],
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'Please submit your hours as soon as possible.',
      },
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: {
            type: 'plain_text',
            text: 'Submit Hours',
            emoji: true,
          },
          url: options.submitUrl,
          style: 'primary',
        },
      ],
    },
  ];

  return sendSlackMessage({
    userId: options.userId,
    text: `Hours Reminder: ${options.projectName}`,
    blocks,
  });
}
