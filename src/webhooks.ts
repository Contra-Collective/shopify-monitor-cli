import axios from 'axios';
import * as nodemailer from 'nodemailer';
import { ChangelogEntry, EmailConfig, GenericWebhook } from './types';

function detectPriority(entry: ChangelogEntry): 'critical' | 'high' | 'normal' {
  const searchText = `${entry.title} ${entry.description}`.toLowerCase();

  // Critical keywords
  if (searchText.includes('breaking') ||
      searchText.includes('security') ||
      searchText.includes('critical') ||
      searchText.includes('urgent')) {
    return 'critical';
  }

  // High priority keywords
  if (searchText.includes('deprecated') ||
      searchText.includes('required') ||
      searchText.includes('removed') ||
      searchText.includes('changed')) {
    return 'high';
  }

  return 'normal';
}

export async function sendToSlack(webhookUrl: string, entry: ChangelogEntry): Promise<void> {
  const priority = detectPriority(entry);

  // Choose icon and header based on priority
  let headerIcon = '⚡';
  let headerText = 'Shopify Changelog Update';
  let contextEmoji = '📄';

  if (priority === 'critical') {
    headerIcon = '🚨';
    headerText = 'CRITICAL: Shopify Changelog Update';
    contextEmoji = '🚨';
  } else if (priority === 'high') {
    headerIcon = '⚠️';
    headerText = 'Important: Shopify Changelog Update';
    contextEmoji = '⚠️';
  }

  const message = {
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: `${headerIcon} ${headerText}`,
          emoji: true
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${contextEmoji} *${entry.title}*\n\n${entry.description || '_No detailed description available. Click below to view full changelog entry._'}`
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*Category:*\n${entry.category}`
          },
          {
            type: 'mrkdwn',
            text: `*Date:*\n${entry.date}`
          },
          {
            type: 'mrkdwn',
            text: `*Priority:*\n${priority.toUpperCase()}`
          }
        ]
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'View Full Details →',
              emoji: true
            },
            url: entry.url,
            style: priority === 'critical' ? 'danger' : (priority === 'high' ? 'primary' : undefined)
          }
        ]
      }
    ]
  };

  try {
    await axios.post(webhookUrl, message);
  } catch (error) {
    console.error('Error sending to Slack:', error);
    throw error;
  }
}

export async function sendToTeams(webhookUrl: string, entry: ChangelogEntry): Promise<void> {
  const priority = detectPriority(entry);

  // Choose color and icon based on priority
  let themeColor = '5E72E4'; // Modern blue-purple
  let titleIcon = '⚡';
  let titlePrefix = '';

  if (priority === 'critical') {
    themeColor = 'FF0000'; // Red
    titleIcon = '🚨';
    titlePrefix = 'CRITICAL: ';
  } else if (priority === 'high') {
    themeColor = 'FFA500'; // Orange
    titleIcon = '⚠️';
    titlePrefix = 'IMPORTANT: ';
  }

  const message = {
    '@type': 'MessageCard',
    '@context': 'https://schema.org/extensions',
    summary: `${titlePrefix}Shopify Changelog Update`,
    themeColor,
    title: `${titleIcon} ${titlePrefix}Shopify Changelog Update`,
    sections: [
      {
        activityTitle: `${titleIcon} ${entry.title}`,
        activitySubtitle: `${entry.date} | Priority: ${priority.toUpperCase()}`,
        facts: [
          {
            name: 'Category',
            value: entry.category
          },
          {
            name: 'Priority Level',
            value: priority.toUpperCase()
          }
        ],
        text: entry.description || '_No detailed description available. Click below to view full changelog entry._'
      }
    ],
    potentialAction: [
      {
        '@type': 'OpenUri',
        name: 'View Changelog',
        targets: [
          {
            os: 'default',
            uri: entry.url
          }
        ]
      }
    ]
  };

  try {
    await axios.post(webhookUrl, message);
  } catch (error) {
    console.error('Error sending to Teams:', error);
    throw error;
  }
}

export async function sendEmail(config: EmailConfig, entry: ChangelogEntry): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure ?? false,
    auth: {
      user: config.auth.user,
      pass: config.auth.pass
    }
  });

  const priority = detectPriority(entry);

  let headerIcon = '⚡';
  let headerStyle = 'color: #5E72E4;';
  let priorityBadge = '<span style="background: #5E72E4; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">NORMAL</span>';

  if (priority === 'critical') {
    headerIcon = '🚨';
    headerStyle = 'color: #FF0000;';
    priorityBadge = '<span style="background: #FF0000; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">⚠️ CRITICAL</span>';
  } else if (priority === 'high') {
    headerIcon = '⚠️';
    headerStyle = 'color: #FFA500;';
    priorityBadge = '<span style="background: #FFA500; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px;">⚠️ HIGH PRIORITY</span>';
  }

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px;">
      <h2 style="${headerStyle}">${headerIcon} Shopify Changelog Update</h2>
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <h3 style="margin-top: 0;"><a href="${entry.url}" style="color: #333; text-decoration: none;">${entry.title}</a></h3>
        <p style="margin: 10px 0;"><strong>Category:</strong> ${entry.category} | <strong>Date:</strong> ${entry.date}</p>
        <p style="margin: 10px 0;">${priorityBadge}</p>
      </div>
      <div style="margin: 15px 0;">
        <p><strong>Description:</strong></p>
        <p style="line-height: 1.6;">${entry.description || '<em>No detailed description available. Click below to view full changelog entry.</em>'}</p>
      </div>
      <p><a href="${entry.url}" style="background: ${priority === 'critical' ? '#FF0000' : '#5E72E4'}; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Full Details →</a></p>
    </div>
  `;

  try {
    await transporter.sendMail({
      from: config.from,
      to: config.to.join(', '),
      subject: `Shopify Changelog: ${entry.title}`,
      html
    });
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

export async function sendToGenericWebhook(webhook: GenericWebhook, entry: ChangelogEntry): Promise<void> {
  const method = webhook.method || 'POST';
  const headers = webhook.headers || { 'Content-Type': 'application/json' };

  let payload: any;

  if (webhook.template) {
    // Use custom template with variable substitution
    const templateStr = webhook.template
      .replace(/\{\{title\}\}/g, entry.title)
      .replace(/\{\{description\}\}/g, entry.description || '')
      .replace(/\{\{category\}\}/g, entry.category)
      .replace(/\{\{date\}\}/g, entry.date)
      .replace(/\{\{url\}\}/g, entry.url)
      .replace(/\{\{id\}\}/g, entry.id);

    payload = JSON.parse(templateStr);
  } else {
    // Default payload
    payload = {
      title: entry.title,
      description: entry.description,
      category: entry.category,
      date: entry.date,
      url: entry.url,
      source: 'shopify-changelog-monitor'
    };
  }

  try {
    await axios({
      method,
      url: webhook.url,
      headers,
      data: payload
    });
  } catch (error) {
    console.error('Error sending to generic webhook:', error);
    throw error;
  }
}

export async function notifyWebhooks(
  entry: ChangelogEntry,
  slackWebhooks: string[] = [],
  teamsWebhooks: string[] = [],
  emailConfig?: EmailConfig,
  genericWebhooks: GenericWebhook[] = [],
  dryRun: boolean = false
): Promise<void> {
  if (dryRun) {
    console.log('\n[DRY RUN] Would send notifications:');
    if (slackWebhooks.length > 0) {
      console.log(`  - Slack: ${slackWebhooks.length} webhook(s)`);
    }
    if (teamsWebhooks.length > 0) {
      console.log(`  - Teams: ${teamsWebhooks.length} webhook(s)`);
    }
    if (emailConfig) {
      console.log(`  - Email: ${emailConfig.to.length} recipient(s)`);
    }
    if (genericWebhooks.length > 0) {
      console.log(`  - Generic webhooks: ${genericWebhooks.length}`);
    }
    return;
  }

  const promises: Promise<void>[] = [];

  // Send to all Slack webhooks
  for (const webhookUrl of slackWebhooks) {
    promises.push(sendToSlack(webhookUrl, entry));
  }

  // Send to all Teams webhooks
  for (const webhookUrl of teamsWebhooks) {
    promises.push(sendToTeams(webhookUrl, entry));
  }

  // Send email
  if (emailConfig) {
    promises.push(sendEmail(emailConfig, entry));
  }

  // Send to generic webhooks
  for (const webhook of genericWebhooks) {
    promises.push(sendToGenericWebhook(webhook, entry));
  }

  await Promise.allSettled(promises);
}
