#!/usr/bin/env node

import { Command } from 'commander';
import * as cron from 'node-cron';
import { fetchShopifyChangelog, getNewEntries, markPriority } from './fetcher';
import { notifyWebhooks } from './webhooks';
import { StateManager } from './storage';
import { loadConfig, mergeConfig, validateConfig } from './config';
import { MonitorConfig } from './types';

const program = new Command();

program
  .name('shopify-monitor')
  .description('CLI tool to monitor Shopify changelog and send updates to webhooks')
  .version('1.0.0');

program
  .command('check')
  .description('Check for new changelog entries once')
  .option('-c, --config <path>', 'Path to config file')
  .option('--slack <urls...>', 'Slack webhook URLs')
  .option('--teams <urls...>', 'Teams webhook URLs')
  .option('--state-file <path>', 'Path to state file')
  .option('--dry-run', 'Dry run mode - show what would be sent without actually sending')
  .option('--filter-categories <categories...>', 'Filter by categories')
  .option('--filter-keywords <keywords...>', 'Filter by keywords (include)')
  .option('--exclude-keywords <keywords...>', 'Exclude entries with these keywords')
  .action(async (options) => {
    try {
      console.log('Checking Shopify changelog for updates...');

      // Load config
      const fileConfig = loadConfig(options.config);
      const cliConfig: Partial<MonitorConfig> = {
        webhooks: {
          slack: options.slack,
          teams: options.teams
        },
        stateFile: options.stateFile,
        dryRun: options.dryRun,
        filters: {
          categories: options.filterCategories,
          keywords: options.filterKeywords,
          excludeKeywords: options.excludeKeywords
        }
      };

      const config = mergeConfig(fileConfig, cliConfig);
      if (!config.dryRun) {
        validateConfig(config);
      }

      const stateManager = new StateManager(config.stateFile);
      const seenEntries = stateManager.getSeenEntries();

      const newEntries = await getNewEntries(seenEntries, config.filters);

      if (newEntries.length === 0) {
        console.log('No new changelog entries found.');
        return;
      }

      console.log(`Found ${newEntries.length} new changelog entries.`);

      for (const entry of newEntries) {
        const { priority } = markPriority(entry, config.filters);
        const priorityIcon = priority === 'high' ? '🚨' : '📄';

        console.log(`\n${priorityIcon} ${entry.title}`);
        console.log(`   Category: ${entry.category}`);
        console.log(`   Date: ${entry.date}`);
        console.log(`   URL: ${entry.url}`);
        if (priority === 'high') {
          console.log(`   ⚠️  HIGH PRIORITY`);
        }

        await notifyWebhooks(
          entry,
          config.webhooks.slack || [],
          config.webhooks.teams || [],
          config.webhooks.email,
          config.webhooks.generic || [],
          config.dryRun
        );

        if (!config.dryRun) {
          console.log('   ✓ Webhooks notified');
          stateManager.addSeenEntry(entry.id);
        }
      }

      console.log('\n✓ Check complete!');
    } catch (error) {
      console.error('Error checking changelog:', error);
      process.exit(1);
    }
  });

program
  .command('watch')
  .description('Continuously monitor changelog for updates')
  .option('-c, --config <path>', 'Path to config file')
  .option('--slack <urls...>', 'Slack webhook URLs')
  .option('--teams <urls...>', 'Teams webhook URLs')
  .option('--interval <minutes>', 'Check interval in minutes', '15')
  .option('--state-file <path>', 'Path to state file')
  .option('--dry-run', 'Dry run mode - show what would be sent without actually sending')
  .option('--filter-categories <categories...>', 'Filter by categories')
  .option('--filter-keywords <keywords...>', 'Filter by keywords (include)')
  .option('--exclude-keywords <keywords...>', 'Exclude entries with these keywords')
  .action(async (options) => {
    const interval = parseInt(options.interval, 10);

    if (isNaN(interval) || interval < 1) {
      console.error('Invalid interval. Must be a positive number.');
      process.exit(1);
    }

    // Load config
    const fileConfig = loadConfig(options.config);
    const cliConfig: Partial<MonitorConfig> = {
      webhooks: {
        slack: options.slack,
        teams: options.teams
      },
      stateFile: options.stateFile,
      dryRun: options.dryRun,
      checkInterval: interval,
      filters: {
        categories: options.filterCategories,
        keywords: options.filterKeywords,
        excludeKeywords: options.excludeKeywords
      }
    };

    const config = mergeConfig(fileConfig, cliConfig);
    if (!config.dryRun) {
      validateConfig(config);
    }

    console.log(`Starting Shopify changelog monitor...`);
    console.log(`Check interval: ${interval} minutes`);
    if (config.dryRun) {
      console.log(`⚠️  DRY RUN MODE - No webhooks will be sent`);
    }
    if (config.webhooks.slack) {
      console.log(`Slack webhooks: ${config.webhooks.slack.length}`);
    }
    if (config.webhooks.teams) {
      console.log(`Teams webhooks: ${config.webhooks.teams.length}`);
    }
    if (config.webhooks.email) {
      console.log(`Email recipients: ${config.webhooks.email.to.length}`);
    }
    if (config.webhooks.generic) {
      console.log(`Generic webhooks: ${config.webhooks.generic.length}`);
    }
    if (config.filters?.categories) {
      console.log(`Filtering categories: ${config.filters.categories.join(', ')}`);
    }
    if (config.filters?.keywords) {
      console.log(`Filtering keywords: ${config.filters.keywords.join(', ')}`);
    }

    const stateManager = new StateManager(config.stateFile);

    const checkForUpdates = async () => {
      try {
        const timestamp = new Date().toISOString();
        console.log(`\n[${timestamp}] Checking for updates...`);

        const seenEntries = stateManager.getSeenEntries();
        const newEntries = await getNewEntries(seenEntries, config.filters);

        if (newEntries.length === 0) {
          console.log('No new entries found.');
          return;
        }

        console.log(`Found ${newEntries.length} new entries:`);

        for (const entry of newEntries) {
          const { priority } = markPriority(entry, config.filters);
          const priorityIcon = priority === 'high' ? '🚨' : '📄';

          console.log(`  ${priorityIcon} ${entry.title}`);
          if (priority === 'high') {
            console.log(`     ⚠️  HIGH PRIORITY`);
          }

          await notifyWebhooks(
            entry,
            config.webhooks.slack || [],
            config.webhooks.teams || [],
            config.webhooks.email,
            config.webhooks.generic || [],
            config.dryRun
          );

          if (!config.dryRun) {
            console.log('    ✓ Webhooks notified');
            stateManager.addSeenEntry(entry.id);
          }
        }
      } catch (error) {
        console.error('Error checking for updates:', error);
      }
    };

    // Run immediately on start
    await checkForUpdates();

    // Schedule periodic checks
    const cronExpression = `*/${interval} * * * *`;
    cron.schedule(cronExpression, checkForUpdates);

    console.log('\n✓ Monitor started. Press Ctrl+C to stop.\n');
  });

program
  .command('list')
  .description('List all current changelog entries')
  .option('--limit <number>', 'Limit number of entries to display', '10')
  .option('--filter-categories <categories...>', 'Filter by categories')
  .option('--filter-keywords <keywords...>', 'Filter by keywords (include)')
  .option('--exclude-keywords <keywords...>', 'Exclude entries with these keywords')
  .action(async (options) => {
    try {
      console.log('Fetching Shopify changelog entries...\n');

      const entries = await fetchShopifyChangelog();
      const limit = parseInt(options.limit, 10);

      // Apply filters
      const filters = {
        categories: options.filterCategories,
        keywords: options.filterKeywords,
        excludeKeywords: options.excludeKeywords
      };

      const { applyFilters } = await import('./fetcher');
      const filteredEntries = applyFilters(entries, filters);
      const displayEntries = filteredEntries.slice(0, limit);

      if (displayEntries.length === 0) {
        console.log('No changelog entries found.');
        return;
      }

      displayEntries.forEach((entry, index) => {
        const { priority } = markPriority(entry, filters);
        const priorityIcon = priority === 'high' ? '🚨' : '📄';

        console.log(`${index + 1}. ${priorityIcon} ${entry.title}`);
        console.log(`   Category: ${entry.category}`);
        console.log(`   Date: ${entry.date}`);
        console.log(`   URL: ${entry.url}`);
        if (priority === 'high') {
          console.log(`   ⚠️  HIGH PRIORITY`);
        }
        if (entry.description) {
          console.log(`   Description: ${entry.description.substring(0, 100)}...`);
        }
        console.log('');
      });

      console.log(`Showing ${displayEntries.length} of ${filteredEntries.length} filtered entries (${entries.length} total).`);
    } catch (error) {
      console.error('Error listing changelog:', error);
      process.exit(1);
    }
  });

program
  .command('reset')
  .description('Reset the state file (clears all seen entries)')
  .option('--state-file <path>', 'Path to state file')
  .action((options) => {
    try {
      const stateManager = new StateManager(options.stateFile);
      stateManager.clearState();
      console.log('✓ State file reset successfully.');
    } catch (error) {
      console.error('Error resetting state:', error);
      process.exit(1);
    }
  });

program
  .command('configure')
  .alias('setup')
  .description('Interactive configuration wizard')
  .action(async () => {
    try {
      const { interactiveConfiguration } = await import('./configure');
      await interactiveConfiguration();
    } catch (error) {
      console.error('Error running configuration wizard:', error);
      process.exit(1);
    }
  });

program.parse();
