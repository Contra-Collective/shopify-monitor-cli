// Export all public APIs
export { fetchShopifyChangelog, getNewEntries, applyFilters, markPriority } from './fetcher';
export { sendToSlack, sendToTeams, sendEmail, sendToGenericWebhook, notifyWebhooks } from './webhooks';
export { StateManager } from './storage';
export { ShopifyChangelogMonitor, createShopifyMonitor } from './middleware';
export { loadConfig, mergeConfig, validateConfig } from './config';
export * from './types';
