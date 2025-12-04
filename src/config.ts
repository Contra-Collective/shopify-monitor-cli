import * as fs from 'fs';
import * as path from 'path';
import { MonitorConfig } from './types';

export function loadConfig(configPath?: string): MonitorConfig | null {
  const possiblePaths = [
    configPath,
    path.join(process.cwd(), 'shopify-monitor.config.js'),
    path.join(process.cwd(), 'shopify-monitor.config.json'),
    path.join(process.cwd(), '.shopifymonitorrc'),
    path.join(process.cwd(), '.shopifymonitorrc.json')
  ].filter(Boolean) as string[];

  for (const configFile of possiblePaths) {
    if (fs.existsSync(configFile)) {
      try {
        console.log(`Loading config from: ${configFile}`);

        if (configFile.endsWith('.js')) {
          // Require JavaScript config file
          delete require.cache[require.resolve(path.resolve(configFile))];
          const config = require(path.resolve(configFile));
          return config.default || config;
        } else {
          // Parse JSON config file
          const configData = fs.readFileSync(configFile, 'utf8');
          return JSON.parse(configData);
        }
      } catch (error) {
        console.error(`Error loading config from ${configFile}:`, error);
        throw error;
      }
    }
  }

  return null;
}

export function validateConfig(config: MonitorConfig): void {
  if (!config.webhooks) {
    throw new Error('Config must include webhooks configuration');
  }

  const hasAnyWebhook =
    (config.webhooks.slack && config.webhooks.slack.length > 0) ||
    (config.webhooks.teams && config.webhooks.teams.length > 0) ||
    config.webhooks.email ||
    (config.webhooks.generic && config.webhooks.generic.length > 0);

  if (!hasAnyWebhook) {
    throw new Error('Config must include at least one webhook configuration');
  }

  if (config.webhooks.email) {
    const { host, port, auth, from, to } = config.webhooks.email;
    if (!host || !port || !auth || !auth.user || !auth.pass || !from || !to || to.length === 0) {
      throw new Error('Email config is incomplete');
    }
  }

  if (config.webhooks.generic) {
    for (const webhook of config.webhooks.generic) {
      if (!webhook.url) {
        throw new Error('Generic webhook must have a URL');
      }
    }
  }
}

export function mergeConfig(fileConfig: MonitorConfig | null, cliConfig: Partial<MonitorConfig>): MonitorConfig {
  // Start with file config or empty
  const config: MonitorConfig = {
    webhooks: {},
    ...fileConfig
  };

  // Only override with CLI config if values are explicitly provided (not undefined)
  if (cliConfig.checkInterval !== undefined) {
    config.checkInterval = cliConfig.checkInterval;
  }
  if (cliConfig.stateFile !== undefined) {
    config.stateFile = cliConfig.stateFile;
  }
  if (cliConfig.dryRun !== undefined) {
    config.dryRun = cliConfig.dryRun;
  }

  // Merge filters
  if (cliConfig.filters) {
    config.filters = {
      categories: cliConfig.filters.categories || fileConfig?.filters?.categories,
      keywords: cliConfig.filters.keywords || fileConfig?.filters?.keywords,
      excludeKeywords: cliConfig.filters.excludeKeywords || fileConfig?.filters?.excludeKeywords
    };
  }

  // Merge webhooks (add CLI webhooks to file webhooks)
  if (fileConfig?.webhooks || cliConfig.webhooks) {
    config.webhooks = {
      slack: [...(fileConfig?.webhooks?.slack || []), ...(cliConfig.webhooks?.slack || [])],
      teams: [...(fileConfig?.webhooks?.teams || []), ...(cliConfig.webhooks?.teams || [])],
      email: cliConfig.webhooks?.email || fileConfig?.webhooks?.email,
      generic: [...(fileConfig?.webhooks?.generic || []), ...(cliConfig.webhooks?.generic || [])]
    };
  }

  return config;
}
