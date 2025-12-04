import inquirer from 'inquirer';
import * as fs from 'fs';
import * as path from 'path';

export async function interactiveConfiguration(): Promise<void> {
  console.log('\n🎯 Shopify Changelog Monitor - Interactive Setup\n');
  console.log('Let\'s configure your notification preferences!\n');

  const answers = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'notificationChannels',
      message: '📢 Which notification channels do you want to use?',
      choices: [
        { name: '💬 Slack', value: 'slack' },
        { name: '👥 Microsoft Teams', value: 'teams' },
        { name: '📧 Email', value: 'email' },
        { name: '🔗 Generic Webhook (PagerDuty, custom, etc.)', value: 'generic' }
      ],
      validate: (input) => input.length > 0 || 'Please select at least one notification channel'
    }
  ]);

  const config: any = {
    webhooks: {}
  };

  // Configure Slack
  if (answers.notificationChannels.includes('slack')) {
    console.log('\n📱 SLACK WEBHOOK SETUP');
    console.log('━'.repeat(60));
    console.log('');
    console.log('To create a Slack webhook:');
    console.log('1. Go to https://api.slack.com/apps');
    console.log('2. Click "Create New App" → "From scratch"');
    console.log('3. Name it "Shopify Monitor" and select your workspace');
    console.log('4. Click "Incoming Webhooks" (left sidebar)');
    console.log('5. Toggle "Activate Incoming Webhooks" to ON');
    console.log('6. Click "Add New Webhook to Workspace"');
    console.log('7. Choose your channel and click "Allow"');
    console.log('8. Copy the webhook URL (starts with https://hooks.slack.com/services/)');
    console.log('');
    console.log('━'.repeat(60));
    console.log('');

    await inquirer.prompt([
      {
        type: 'confirm',
        name: 'ready',
        message: 'Have you created your Slack webhook?',
        default: true
      }
    ]);

    const slackAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'slackWebhook',
        message: '💬 Paste your Slack webhook URL:',
        validate: (input) => {
          if (!input) return 'Slack webhook URL is required';
          if (!input.startsWith('https://hooks.slack.com/services/')) {
            return 'Invalid Slack webhook URL (should start with https://hooks.slack.com/services/)';
          }
          return true;
        }
      },
      {
        type: 'confirm',
        name: 'addMoreSlack',
        message: 'Add another Slack webhook?',
        default: false
      }
    ]);

    config.webhooks.slack = [slackAnswers.slackWebhook];

    if (slackAnswers.addMoreSlack) {
      let addMore = true;
      while (addMore) {
        const moreSlack = await inquirer.prompt([
          {
            type: 'input',
            name: 'webhook',
            message: '💬 Enter additional Slack webhook URL:'
          },
          {
            type: 'confirm',
            name: 'continue',
            message: 'Add another?',
            default: false
          }
        ]);
        config.webhooks.slack.push(moreSlack.webhook);
        addMore = moreSlack.continue;
      }
    }
  }

  // Configure Teams
  if (answers.notificationChannels.includes('teams')) {
    console.log('\n📱 MICROSOFT TEAMS WEBHOOK SETUP');
    console.log('━'.repeat(60));
    console.log('');
    console.log('To create a Teams webhook:');
    console.log('1. Open your Teams channel');
    console.log('2. Click the ⋯ (three dots) next to the channel name');
    console.log('3. Select "Connectors" or "Workflows"');
    console.log('4. Search for "Incoming Webhook"');
    console.log('5. Click "Add" or "Configure"');
    console.log('6. Name it "Shopify Monitor" and upload an icon (optional)');
    console.log('7. Click "Create"');
    console.log('8. Copy the webhook URL');
    console.log('');
    console.log('━'.repeat(60));
    console.log('');

    await inquirer.prompt([
      {
        type: 'confirm',
        name: 'ready',
        message: 'Have you created your Teams webhook?',
        default: true
      }
    ]);

    const teamsAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'teamsWebhook',
        message: '👥 Paste your Microsoft Teams webhook URL:',
        validate: (input) => {
          if (!input) return 'Teams webhook URL is required';
          if (!input.includes('webhook')) {
            return 'Invalid Teams webhook URL';
          }
          return true;
        }
      }
    ]);
    config.webhooks.teams = [teamsAnswers.teamsWebhook];
  }

  // Configure Email
  if (answers.notificationChannels.includes('email')) {
    const emailAnswers = await inquirer.prompt([
      {
        type: 'input',
        name: 'host',
        message: '📧 SMTP Host (e.g., smtp.gmail.com):',
        default: 'smtp.gmail.com'
      },
      {
        type: 'number',
        name: 'port',
        message: '📧 SMTP Port:',
        default: 587
      },
      {
        type: 'input',
        name: 'user',
        message: '📧 Email username:'
      },
      {
        type: 'password',
        name: 'pass',
        message: '📧 Email password (app password recommended):',
        mask: '*'
      },
      {
        type: 'input',
        name: 'from',
        message: '📧 From address:',
        default: 'Shopify Monitor <monitor@example.com>'
      },
      {
        type: 'input',
        name: 'to',
        message: '📧 To address(es) (comma-separated):',
        filter: (input) => input.split(',').map((s: string) => s.trim())
      }
    ]);

    config.webhooks.email = {
      host: emailAnswers.host,
      port: emailAnswers.port,
      secure: emailAnswers.port === 465,
      auth: {
        user: emailAnswers.user,
        pass: emailAnswers.pass
      },
      from: emailAnswers.from,
      to: emailAnswers.to
    };
  }

  // Priority Levels
  const priorityAnswers = await inquirer.prompt([
    {
      type: 'checkbox',
      name: 'priorities',
      message: '⚡ Which priority levels do you want to receive?',
      choices: [
        { name: '🚨 CRITICAL (breaking, security, urgent)', value: 'critical', checked: true },
        { name: '⚠️  HIGH (deprecated, required, removed)', value: 'high', checked: true },
        { name: '📄 NORMAL (regular updates)', value: 'normal', checked: true }
      ],
      validate: (input) => input.length > 0 || 'Select at least one priority level'
    }
  ]);

  // Build filter keywords based on priority selection
  const keywords: string[] = [];
  if (!priorityAnswers.priorities.includes('critical') || !priorityAnswers.priorities.includes('high')) {
    // Only add keyword filters if not receiving all updates
    if (priorityAnswers.priorities.includes('critical')) {
      keywords.push('breaking', 'critical', 'security', 'urgent');
    }
    if (priorityAnswers.priorities.includes('high')) {
      keywords.push('deprecated', 'required', 'removed');
    }
  }

  // Category filtering
  const categoryAnswers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'filterCategories',
      message: '📂 Do you want to filter by specific categories?',
      default: false
    }
  ]);

  if (categoryAnswers.filterCategories) {
    const categorySelection = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'categories',
        message: '📂 Select categories to monitor:',
        choices: [
          { name: 'API', value: 'API' },
          { name: 'Apps', value: 'Apps' },
          { name: 'Payments', value: 'Payments' },
          { name: 'Checkout', value: 'Checkout' },
          { name: 'Storefront', value: 'Storefront' },
          { name: 'Admin', value: 'Admin' }
        ]
      }
    ]);

    if (categorySelection.categories.length > 0) {
      config.filters = config.filters || {};
      config.filters.categories = categorySelection.categories;
    }
  }

  // Additional keyword filtering
  const keywordAnswers = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'addKeywords',
      message: '🔍 Add custom keyword filters?',
      default: false
    }
  ]);

  if (keywordAnswers.addKeywords) {
    const customKeywords = await inquirer.prompt([
      {
        type: 'input',
        name: 'keywords',
        message: '🔍 Enter keywords (comma-separated):',
        filter: (input) => input ? input.split(',').map((s: string) => s.trim()) : []
      }
    ]);

    if (customKeywords.keywords.length > 0) {
      config.filters = config.filters || {};
      config.filters.keywords = [...keywords, ...customKeywords.keywords];
    }
  } else if (keywords.length > 0) {
    config.filters = config.filters || {};
    config.filters.keywords = keywords;
  }

  // Check interval
  const intervalAnswers = await inquirer.prompt([
    {
      type: 'list',
      name: 'interval',
      message: '⏱️  How often should we check for updates?',
      choices: [
        { name: 'Every 5 minutes (frequent)', value: 5 },
        { name: 'Every 15 minutes (recommended)', value: 15 },
        { name: 'Every 30 minutes', value: 30 },
        { name: 'Every hour', value: 60 }
      ],
      default: 15
    }
  ]);

  config.checkInterval = intervalAnswers.interval;

  // Save configuration
  const saveAnswers = await inquirer.prompt([
    {
      type: 'list',
      name: 'format',
      message: '💾 Save configuration as:',
      choices: [
        { name: 'JavaScript (.js) - Recommended', value: 'js' },
        { name: 'JSON (.json)', value: 'json' }
      ],
      default: 'js'
    }
  ]);

  const configPath = saveAnswers.format === 'js'
    ? 'shopify-monitor.config.js'
    : 'shopify-monitor.config.json';

  // Generate config file content
  let configContent: string;
  if (saveAnswers.format === 'js') {
    configContent = `module.exports = ${JSON.stringify(config, null, 2)};\n`;
  } else {
    configContent = JSON.stringify(config, null, 2);
  }

  fs.writeFileSync(configPath, configContent);

  console.log('\n✅ Configuration saved to:', configPath);
  console.log('\n📋 Summary:');
  console.log('  Channels:', answers.notificationChannels.join(', '));
  console.log('  Priorities:', priorityAnswers.priorities.map((p: string) => p.toUpperCase()).join(', '));
  console.log('  Check interval:', intervalAnswers.interval, 'minutes');
  if (config.filters?.categories) {
    console.log('  Categories:', config.filters.categories.join(', '));
  }
  if (config.filters?.keywords) {
    console.log('  Keywords:', config.filters.keywords.join(', '));
  }

  console.log('\n🚀 Ready to start monitoring!');
  console.log('\nRun: shopify-monitor watch --config', configPath);
  console.log('Or:  shopify-monitor check --config', configPath, '--dry-run\n');
}
