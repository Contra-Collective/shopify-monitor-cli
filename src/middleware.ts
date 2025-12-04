import { Request, Response, NextFunction } from 'express';
import * as cron from 'node-cron';
import { getNewEntries } from './fetcher';
import { notifyWebhooks } from './webhooks';
import { StateManager } from './storage';
import { MonitorConfig } from './types';

export class ShopifyChangelogMonitor {
  private config: MonitorConfig;
  private stateManager: StateManager;
  private cronJob?: cron.ScheduledTask;
  private isRunning: boolean = false;

  constructor(config: MonitorConfig) {
    this.config = config;
    this.stateManager = new StateManager(config.stateFile);
  }

  async checkForUpdates(): Promise<void> {
    try {
      const seenEntries = this.stateManager.getSeenEntries();
      const newEntries = await getNewEntries(seenEntries, this.config.filters);

      if (newEntries.length > 0) {
        console.log(`[Shopify Monitor] Found ${newEntries.length} new changelog entries`);

        for (const entry of newEntries) {
          await notifyWebhooks(
            entry,
            this.config.webhooks.slack || [],
            this.config.webhooks.teams || [],
            this.config.webhooks.email,
            this.config.webhooks.generic || [],
            this.config.dryRun
          );

          if (!this.config.dryRun) {
            this.stateManager.addSeenEntry(entry.id);
          }
        }
      }
    } catch (error) {
      console.error('[Shopify Monitor] Error checking for updates:', error);
    }
  }

  start(): void {
    if (this.isRunning) {
      console.warn('[Shopify Monitor] Monitor is already running');
      return;
    }

    const interval = this.config.checkInterval || 15;
    const cronExpression = `*/${interval} * * * *`;

    console.log(`[Shopify Monitor] Starting monitor (check interval: ${interval} minutes)`);

    // Run immediately on start
    this.checkForUpdates();

    // Schedule periodic checks
    this.cronJob = cron.schedule(cronExpression, () => {
      this.checkForUpdates();
    });

    this.isRunning = true;
  }

  stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = undefined;
      this.isRunning = false;
      console.log('[Shopify Monitor] Monitor stopped');
    }
  }

  getStatus(): { isRunning: boolean; lastChecked: string; seenCount: number } {
    const state = this.stateManager.loadState();
    return {
      isRunning: this.isRunning,
      lastChecked: state.lastChecked,
      seenCount: state.seenEntries.length
    };
  }
}

// Express middleware factory
export function createShopifyMonitor(config: MonitorConfig) {
  const monitor = new ShopifyChangelogMonitor(config);

  // Start monitoring
  monitor.start();

  // Return middleware that exposes monitor status endpoint
  return {
    monitor,
    middleware: (req: Request, res: Response, next: NextFunction) => {
      // Add monitor instance to request object
      (req as any).shopifyMonitor = monitor;
      next();
    },
    statusHandler: (req: Request, res: Response) => {
      const status = monitor.getStatus();
      res.json(status);
    },
    checkHandler: async (req: Request, res: Response) => {
      try {
        await monitor.checkForUpdates();
        res.json({ success: true, message: 'Check completed' });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  };
}
