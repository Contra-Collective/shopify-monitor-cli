import express from 'express';
import { createShopifyMonitor } from '../src';

const app = express();
app.use(express.json());

// Create Shopify changelog monitor
const { monitor, middleware, statusHandler, checkHandler } = createShopifyMonitor({
  webhooks: {
    slack: [
      process.env.SLACK_WEBHOOK_URL || 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
    ],
    teams: [
      process.env.TEAMS_WEBHOOK_URL || 'https://outlook.office.com/webhook/YOUR/WEBHOOK/URL'
    ]
  },
  checkInterval: parseInt(process.env.CHECK_INTERVAL || '15', 10),
  stateFile: process.env.STATE_FILE_PATH
});

// Apply middleware (makes monitor available in req.shopifyMonitor)
app.use(middleware);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Monitor status endpoint
app.get('/shopify-monitor/status', statusHandler);

// Manual trigger endpoint
app.post('/shopify-monitor/check', checkHandler);

// Custom endpoint using monitor directly
app.get('/shopify-monitor/info', (req, res) => {
  const status = monitor.getStatus();
  res.json({
    service: 'Shopify Changelog Monitor',
    ...status,
    config: {
      slackWebhooks: (monitor as any).config.webhooks.slack?.length || 0,
      teamsWebhooks: (monitor as any).config.webhooks.teams?.length || 0,
      checkInterval: (monitor as any).config.checkInterval || 15
    }
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Monitor status: http://localhost:${PORT}/shopify-monitor/status`);
  console.log(`Manual check: POST http://localhost:${PORT}/shopify-monitor/check`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, stopping monitor...');
  monitor.stop();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, stopping monitor...');
  monitor.stop();
  process.exit(0);
});
