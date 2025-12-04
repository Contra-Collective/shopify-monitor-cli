module.exports = {
  // Webhook configurations
  webhooks: {
    // Slack webhook URLs (array)
    slack: [
      process.env.SLACK_WEBHOOK_URL || 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
    ],

    // Microsoft Teams webhook URLs (array)
    teams: [
      process.env.TEAMS_WEBHOOK_URL || 'https://outlook.office.com/webhook/YOUR/WEBHOOK/URL'
    ],

    // Email configuration
    email: {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER || 'your-email@gmail.com',
        pass: process.env.EMAIL_PASS || 'your-app-password'
      },
      from: 'Shopify Monitor <monitor@example.com>',
      to: ['recipient1@example.com', 'recipient2@example.com']
    },

    // Generic webhooks (for PagerDuty, custom endpoints, etc.)
    generic: [
      {
        url: 'https://events.pagerduty.com/v2/enqueue',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Token token=YOUR_INTEGRATION_KEY'
        },
        template: JSON.stringify({
          routing_key: 'YOUR_INTEGRATION_KEY',
          event_action: 'trigger',
          payload: {
            summary: '{{title}}',
            source: 'shopify-changelog',
            severity: 'info',
            custom_details: {
              description: '{{description}}',
              category: '{{category}}',
              url: '{{url}}'
            }
          }
        })
      },
      // Custom webhook example
      {
        url: 'https://your-api.com/webhooks/shopify',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'your-api-key'
        }
        // If no template specified, sends default payload:
        // {
        //   title, description, category, date, url, source: 'shopify-changelog-monitor'
        // }
      }
    ]
  },

  // Check interval in minutes (default: 15)
  checkInterval: 15,

  // State file path (default: './shopify-monitor-state.json')
  stateFile: './shopify-monitor-state.json',

  // Filtering options
  filters: {
    // Only include entries from specific categories
    categories: ['API', 'Apps', 'Payments'],

    // Only include entries with these keywords (case-insensitive)
    keywords: ['breaking', 'deprecated', 'security', 'critical'],

    // Exclude entries with these keywords
    excludeKeywords: ['minor', 'typo']
  },

  // Dry run mode - test without sending webhooks (default: false)
  dryRun: false
};
