export interface ChangelogEntry {
  id: string;
  title: string;
  date: string;
  category: string;
  description: string;
  url: string;
}

export interface EmailConfig {
  host: string;
  port: number;
  secure?: boolean;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
  to: string[];
}

export interface GenericWebhook {
  url: string;
  method?: 'POST' | 'PUT';
  headers?: Record<string, string>;
  template?: string; // JSON template with {{variable}} placeholders
}

export interface WebhookConfig {
  slack?: string[];
  teams?: string[];
  email?: EmailConfig;
  generic?: GenericWebhook[];
}

export interface FilterConfig {
  categories?: string[];
  keywords?: string[];
  excludeKeywords?: string[];
}

export interface MonitorConfig {
  webhooks: WebhookConfig;
  checkInterval?: number; // in minutes
  stateFile?: string;
  filters?: FilterConfig;
  dryRun?: boolean;
}

export interface MonitorState {
  lastChecked: string;
  seenEntries: string[];
}
