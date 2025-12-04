# Quick Start Guide

## Installation

```bash
# Install dependencies
npm install

# Build the project
npm run build
```

## CLI Quick Start

### 1. One-Time Check

Check for new Shopify changelog entries:

```bash
# Using npx
npx ts-node src/cli.ts check --slack YOUR_SLACK_WEBHOOK_URL

# After building
node dist/cli.js check --slack YOUR_SLACK_WEBHOOK_URL
```

### 2. Continuous Monitoring

Monitor changelog every 15 minutes:

```bash
npx ts-node src/cli.ts watch --slack YOUR_SLACK_WEBHOOK_URL --teams YOUR_TEAMS_WEBHOOK_URL --interval 15
```

### 3. List Current Entries

View the latest changelog entries without sending notifications:

```bash
npx ts-node src/cli.ts list --limit 5
```

## Express Middleware Quick Start

### 1. Create a New Express App

```typescript
// server.ts
import express from 'express';
import { createShopifyMonitor } from './src';

const app = express();

const { monitor, middleware, statusHandler, checkHandler } = createShopifyMonitor({
  webhooks: {
    slack: ['YOUR_SLACK_WEBHOOK_URL'],
    teams: ['YOUR_TEAMS_WEBHOOK_URL']
  },
  checkInterval: 15
});

app.use(middleware);
app.get('/monitor/status', statusHandler);
app.post('/monitor/check', checkHandler);

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});
```

### 2. Run the Server

```bash
npx ts-node server.ts
```

### 3. Test the Endpoints

```bash
# Check status
curl http://localhost:3000/monitor/status

# Trigger manual check
curl -X POST http://localhost:3000/monitor/check
```

## Using Environment Variables

### 1. Copy the example file

```bash
cp .env.example .env
```

### 2. Edit .env with your webhooks

```env
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
TEAMS_WEBHOOK_URL=https://outlook.office.com/webhook/YOUR/WEBHOOK/URL
CHECK_INTERVAL=15
```

### 3. Use in your code

```typescript
import dotenv from 'dotenv';
dotenv.config();

const { monitor } = createShopifyMonitor({
  webhooks: {
    slack: [process.env.SLACK_WEBHOOK_URL!],
    teams: [process.env.TEAMS_WEBHOOK_URL!]
  },
  checkInterval: parseInt(process.env.CHECK_INTERVAL || '15')
});
```

## Getting Webhook URLs

### Slack

1. Visit https://api.slack.com/messaging/webhooks
2. Create a new app or select existing
3. Activate Incoming Webhooks
4. Add New Webhook to Workspace
5. Select channel and copy URL

### Microsoft Teams

1. Open Teams channel
2. Click (...) next to channel name
3. Select "Connectors"
4. Find "Incoming Webhook"
5. Configure and copy URL

## Troubleshooting

### No changelog entries found

The scraper may need adjustment based on Shopify's current page structure. Check `src/fetcher.ts` and update the CSS selectors if needed.

### State file permissions

Ensure the application has write permissions in the directory where the state file is stored.

### Webhook errors

Verify webhook URLs are correct and the channels/apps are still active.

## Next Steps

- Check the full [README.md](./README.md) for detailed documentation
- See [examples/](./examples/) for complete working examples
- Customize the notification format in `src/webhooks.ts`
- Adjust scraping logic in `src/fetcher.ts` for your needs
