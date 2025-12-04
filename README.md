# Shopify Changelog Monitor

A powerful CLI tool and Express middleware for monitoring Shopify changelog updates with support for multiple notification channels, intelligent filtering, and priority detection.

## Features

- ✅ Monitor Shopify changelog for new updates
- ✅ **Multiple notification channels**: Slack, Microsoft Teams, Email, Generic Webhooks (PagerDuty, etc.)
- ✅ **Smart filtering**: Category filters, keyword matching, exclusion rules
- ✅ **Priority detection**: Automatically flag critical updates (breaking changes, security, etc.)
- ✅ **Configuration file support**: JSON or JavaScript config files
- ✅ **Dry run mode**: Test without sending actual notifications
- ✅ CLI tool for one-time checks or continuous monitoring
- ✅ Express middleware for integration into Node.js applications
- ✅ Docker support for easy deployment
- ✅ Persistent state tracking to avoid duplicate notifications

## Installation

```bash
# Clone the repository
git clone https://github.com/Contra-Collective/shopify-monitor-cli.git
cd shopify-monitor-cli

# Install dependencies
npm install

# Build the TypeScript source
npm run build

# Link for local development (optional)
npm link
```

After running `npm link`, you can use the `shopify-monitor` command globally on your system, and it will use your local development version.

**Note:** The repository includes example files in the `examples/` directory and configuration templates.

## Quick Start

After cloning and building the repository, you can run commands using the CLI:

```bash
# Run in development mode with ts-node
npm run dev check -- --slack https://hooks.slack.com/services/YOUR/WEBHOOK/URL
npm run dev watch -- --config shopify-monitor.config.js

# Or build first, then run
npm run build
npm start check -- --slack YOUR_WEBHOOK_URL
```

### Using Configuration File

Create a `shopify-monitor.config.js` file in your project directory:

> **Tip:** You can use the example config files in the `examples/` directory or create your own from scratch using the template below.

```javascript
module.exports = {
  webhooks: {
    slack: ['https://hooks.slack.com/services/YOUR/WEBHOOK/URL'],
    teams: ['https://outlook.office.com/webhook/YOUR/WEBHOOK/URL'],
    email: {
      host: 'smtp.gmail.com',
      port: 587,
      auth: {
        user: 'your-email@gmail.com',
        pass: 'your-app-password'
      },
      from: 'Shopify Monitor <monitor@example.com>',
      to: ['recipient@example.com']
    }
  },
  checkInterval: 15,
  filters: {
    categories: ['API', 'Apps'],
    keywords: ['breaking', 'deprecated'],
    excludeKeywords: ['minor']
  }
};
```

Then run:

```bash
shopify-monitor watch --config shopify-monitor.config.js
```

## Configuration

### Config File Locations

The monitor automatically searches for config files in this order:
1. Path specified with `--config` flag
2. `./shopify-monitor.config.js`
3. `./shopify-monitor.config.json`
4. `./.shopifymonitorrc`
5. `./.shopifymonitorrc.json`

### Configuration Options

```typescript
{
  webhooks: {
    slack?: string[];              // Slack webhook URLs
    teams?: string[];              // Teams webhook URLs
    email?: {                      // Email configuration
      host: string;
      port: number;
      secure?: boolean;
      auth: { user: string; pass: string };
      from: string;
      to: string[];
    };
    generic?: {                    // Generic webhooks (PagerDuty, custom, etc.)
      url: string;
      method?: 'POST' | 'PUT';
      headers?: Record<string, string>;
      template?: string;           // JSON template with {{variable}} placeholders
    }[];
  };
  checkInterval?: number;          // Check interval in minutes (default: 15)
  stateFile?: string;              // State file path (default: ./shopify-monitor-state.json)
  filters?: {
    categories?: string[];         // Only include these categories
    keywords?: string[];           // Only include entries with these keywords
    excludeKeywords?: string[];    // Exclude entries with these keywords
  };
  dryRun?: boolean;                // Dry run mode (default: false)
}
```

## CLI Commands

### check

Check for new changelog entries once

```bash
shopify-monitor check [options]

Options:
  -c, --config <path>                    Path to config file
  --slack <urls...>                      Slack webhook URLs
  --teams <urls...>                      Teams webhook URLs
  --state-file <path>                    Path to state file
  --dry-run                              Dry run mode
  --filter-categories <categories...>    Filter by categories
  --filter-keywords <keywords...>        Filter by keywords
  --exclude-keywords <keywords...>       Exclude keywords
```

### watch

Continuously monitor changelog for updates

```bash
shopify-monitor watch [options]

Options:
  -c, --config <path>                    Path to config file
  --interval <minutes>                   Check interval in minutes (default: 15)
  --slack <urls...>                      Slack webhook URLs
  --teams <urls...>                      Teams webhook URLs
  --state-file <path>                    Path to state file
  --dry-run                              Dry run mode
  --filter-categories <categories...>    Filter by categories
  --filter-keywords <keywords...>        Filter by keywords
  --exclude-keywords <keywords...>       Exclude keywords
```

### list

List current changelog entries

```bash
shopify-monitor list [options]

Options:
  --limit <number>                       Number of entries to display (default: 10)
  --filter-categories <categories...>    Filter by categories
  --filter-keywords <keywords...>        Filter by keywords
  --exclude-keywords <keywords...>       Exclude keywords
```

### reset

Reset the state file

```bash
shopify-monitor reset [options]

Options:
  --state-file <path>                    Path to state file
```

## Express Middleware Usage

```typescript
import express from 'express';
import { createShopifyMonitor, loadConfig } from './src/middleware';

const app = express();

// Load config from file
const config = loadConfig('./shopify-monitor.config.js');

// Or define inline
const { monitor, middleware, statusHandler, checkHandler } = createShopifyMonitor({
  webhooks: {
    slack: [process.env.SLACK_WEBHOOK_URL],
    email: {
      host: 'smtp.gmail.com',
      port: 587,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      },
      from: 'Monitor <monitor@example.com>',
      to: ['team@example.com']
    }
  },
  checkInterval: 15,
  filters: {
    keywords: ['breaking', 'deprecated']
  }
});

app.use(middleware);
app.get('/monitor/status', statusHandler);
app.post('/monitor/check', checkHandler);

app.listen(3000);
```

## Notification Channels

### Slack

```javascript
webhooks: {
  slack: [
    'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX'
  ]
}
```

### Microsoft Teams

```javascript
webhooks: {
  teams: [
    'https://outlook.office.com/webhook/xxx/IncomingWebhook/yyy'
  ]
}
```

### Email

```javascript
webhooks: {
  email: {
    host: 'smtp.gmail.com',  // or 'smtp.sendgrid.net', 'smtp.mailgun.org', etc.
    port: 587,
    secure: false,           // true for 465, false for other ports
    auth: {
      user: 'your-email@gmail.com',
      pass: 'your-app-password'
    },
    from: 'Shopify Monitor <monitor@example.com>',
    to: ['dev-team@example.com', 'alerts@example.com']
  }
}
```

### Generic Webhooks (PagerDuty, Custom APIs, etc.)

```javascript
webhooks: {
  generic: [
    {
      url: 'https://events.pagerduty.com/v2/enqueue',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
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
    }
  ]
}
```

Available template variables: `{{title}}`, `{{description}}`, `{{category}}`, `{{date}}`, `{{url}}`, `{{id}}`

## Filtering

### Category Filtering

Only monitor specific changelog categories:

```javascript
filters: {
  categories: ['API', 'Apps', 'Payments']
}
```

### Keyword Filtering

Only include entries containing specific keywords:

```javascript
filters: {
  keywords: ['breaking', 'deprecated', 'security', 'critical']
}
```

### Exclusion Filtering

Exclude entries containing certain keywords:

```javascript
filters: {
  excludeKeywords: ['minor', 'typo', 'documentation']
}
```

### Priority Detection

Entries containing critical keywords are automatically flagged as high priority:
- breaking
- deprecated
- critical
- security
- urgent

High priority entries are marked with 🚨 in CLI output and logged prominently.

## Docker Deployment

### Using Docker Compose (Recommended)

Create a `docker-compose.yml` file in the project directory:

```yaml
version: '3.8'

services:
  shopify-monitor:
    build: .
    restart: unless-stopped
    volumes:
      - ./data:/app/data
      - ./shopify-monitor.config.js:/app/shopify-monitor.config.js:ro
    command: node dist/cli.js watch --config /app/shopify-monitor.config.js
```

2. Run:

```bash
docker-compose up -d
```

### Using Docker Run

```bash
# Build image
docker build -t shopify-monitor .

# Run with environment variables
docker run -d \
  --name shopify-monitor \
  --restart unless-stopped \
  -v $(pwd)/data:/app/data \
  -e SLACK_WEBHOOK_URL="your-slack-webhook" \
  -e CHECK_INTERVAL=15 \
  shopify-monitor
```

### Using Docker with Config File

```bash
docker run -d \
  --name shopify-monitor \
  --restart unless-stopped \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/shopify-monitor.config.js:/app/shopify-monitor.config.js:ro \
  shopify-monitor \
  node dist/cli.js watch --config /app/shopify-monitor.config.js
```

## Dry Run Mode

Test your configuration without sending actual webhooks:

```bash
# CLI
shopify-monitor check --dry-run --config shopify-monitor.config.js

# Config file
{
  "dryRun": true,
  "webhooks": { ... }
}
```

Dry run mode will:
- Fetch changelog entries
- Apply filters
- Show what would be sent
- Skip actual webhook/email delivery
- Not update state file

## Examples

Complete working examples are available in the `examples/` directory:
- `examples/express-example.ts` - Express.js integration
- `examples/standalone-example.ts` - Standalone monitoring script
- `shopify-monitor.config.example.js` - Full config file example
- `shopify-monitor.config.example.json` - JSON config example

## Development

Once you have the repository cloned and dependencies installed:

```bash
# Build TypeScript source
npm run build

# Run in development mode (using ts-node)
npm run dev check -- --slack YOUR_WEBHOOK
npm run dev watch -- --config shopify-monitor.config.js

# Run built version
npm start check -- --slack YOUR_WEBHOOK

# Link for local testing
npm link

# Test the linked version
shopify-monitor --version
```

### Project Structure

```
shopify-monitor-cli/
├── src/                    # TypeScript source files
│   ├── cli.ts             # CLI entry point
│   ├── config.ts          # Configuration management
│   ├── fetcher.ts         # Changelog scraper
│   ├── webhooks.ts        # Notification handlers
│   ├── middleware.ts      # Express middleware
│   └── types.ts           # TypeScript types
├── dist/                  # Compiled JavaScript (generated)
├── examples/              # Example implementations
└── package.json
```

## Troubleshooting

### No changelog entries found

The scraper may need adjustment based on Shopify's current page structure. Check `src/fetcher.ts` and update CSS selectors if needed.

### Email authentication errors

For Gmail, use an [App Password](https://support.google.com/accounts/answer/185833) instead of your regular password.

### Docker permission issues

Ensure the `data/` directory exists and has proper permissions:

```bash
mkdir -p data
chmod 755 data
```

## License

MIT

## Contributing

Issues and pull requests welcome!
