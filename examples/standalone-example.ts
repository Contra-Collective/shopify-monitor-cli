import { ShopifyChangelogMonitor } from '../src';

// Example of using the monitor as a standalone service

const monitor = new ShopifyChangelogMonitor({
  webhooks: {
    slack: [
      process.env.SLACK_WEBHOOK_URL || 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
    ],
    teams: [
      process.env.TEAMS_WEBHOOK_URL || 'https://outlook.office.com/webhook/YOUR/WEBHOOK/URL'
    ]
  },
  checkInterval: 30, // Check every 30 minutes
  stateFile: './my-custom-state.json'
});

console.log('Starting Shopify Changelog Monitor...');

// Start the monitor
monitor.start();

// Check status periodically
setInterval(() => {
  const status = monitor.getStatus();
  console.log('Monitor Status:', status);
}, 60000); // Every minute

// Manual check example
setTimeout(async () => {
  console.log('Running manual check...');
  await monitor.checkForUpdates();
}, 5000);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down...');
  monitor.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down...');
  monitor.stop();
  process.exit(0);
});
