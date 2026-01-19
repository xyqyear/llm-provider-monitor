export type StatusCategory = 'green' | 'yellow' | 'red';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface RequestTemplate {
  id: number;
  name: string;
  description: string | null;
  method: HttpMethod;
  url: string;
  headers: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface RequestTemplateCreate {
  name: string;
  description?: string | null;
  method?: HttpMethod;
  url?: string;
  headers: string;
  body: string;
}

export interface RequestTemplateUpdate {
  name?: string;
  description?: string | null;
  method?: HttpMethod;
  url?: string;
  headers?: string;
  body?: string;
}

export interface Model {
  id: number;
  name: string;
  modelName: string;
  displayName: string;
  defaultPrompt: string | null;
  defaultRegex: string | null;
  systemPrompt: string | null;
  templateId: number | null;
  enabled: boolean;
  sortOrder: number;
}

export interface ModelCreate {
  name: string;
  modelName: string;
  displayName: string;
  defaultPrompt?: string | null;
  defaultRegex?: string | null;
  systemPrompt?: string | null;
  templateId?: number | null;
  enabled?: boolean;
  sortOrder?: number;
}

export interface ModelUpdate {
  name?: string;
  modelName?: string;
  displayName?: string;
  defaultPrompt?: string | null;
  defaultRegex?: string | null;
  systemPrompt?: string | null;
  templateId?: number | null;
  enabled?: boolean;
  sortOrder?: number;
}

export interface ProviderModelStatus {
  modelId: number;
  modelName: string;
  displayName: string;
  enabled: boolean;
  statusId: number | null;
  statusName: string | null;
  statusCategory: StatusCategory | null;
  latencyMs: number | null;
  checkedAt: string | null;
}

export interface ProviderWithModels {
  id: number;
  name: string;
  baseUrl: string;
  website: string | null;
  enabled: boolean;
  intervalSeconds: number | null;
  modelNameMapping: Record<string, string> | null;
  models: ProviderModelStatus[];
}

export interface ProviderAdmin {
  id: number;
  name: string;
  baseUrl: string;
  authToken: string;
  website: string | null;
  enabled: boolean;
  intervalSeconds: number | null;
  modelNameMapping: Record<string, string> | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProviderModelConfig {
  modelId: number;
  enabled: boolean;
  customPrompt?: string | null;
  customRegex?: string | null;
}

export interface ProviderCreate {
  name: string;
  baseUrl: string;
  authToken: string;
  website?: string | null;
  enabled?: boolean;
  intervalSeconds?: number | null;
  modelNameMapping?: Record<string, string> | null;
  models?: ProviderModelConfig[];
}

export interface ProviderUpdate {
  name?: string;
  baseUrl?: string;
  authToken?: string;
  website?: string | null;
  enabled?: boolean;
  intervalSeconds?: number | null;
  modelNameMapping?: Record<string, string> | null;
}

export interface StatusConfig {
  id: number;
  name: string;
  category: StatusCategory;
  httpCodePattern: string | null;
  responseRegex: string | null;
  priority: number;
  createdAt: string;
}

export interface StatusConfigCreate {
  name: string;
  category: StatusCategory;
  httpCodePattern?: string | null;
  responseRegex?: string | null;
  priority?: number;
}

export interface UnmatchedMessage {
  message: string;
  occurrenceCount: number;
  firstSeen: string;
  lastSeen: string;
}

export interface ProbeHistory {
  id: number;
  providerId: number;
  modelId: number;
  statusId: number;
  statusName: string;
  statusCategory: StatusCategory;
  latencyMs: number | null;
  message: string | null;
  checkedAt: string;
}

export interface TimelinePoint {
  timestamp: string;
  timeRangeEnd: string | null;  // For aggregated data, marks end of time range
  statusCategory: StatusCategory | null;  // Only for non-aggregated (90min)
  statusName: string | null;  // Only for non-aggregated (90min)
  count: number;
  greenCount: number;  // For aggregated data
  yellowCount: number;  // For aggregated data
  redCount: number;  // For aggregated data
  uptimePercentage: number | null;  // For aggregated data, uptime within bucket
  avgLatencyMs: number | null;
}

export interface TimelineBatchItem {
  providerId: number;
  modelId: number;
  timeline: TimelinePoint[];
  uptimePercentage: number;
}

export interface TimelineBatchResponse {
  items: TimelineBatchItem[];
}

export type TimeRange = '90min' | '24h' | '7d' | '30d';

export interface GlobalConfig {
  checkIntervalSeconds: number;
  checkTimeoutSeconds: number;
  maxParallelChecks: number;
  dataRetentionDays: number;
  hasAdminPassword: boolean;
}

export interface GlobalConfigUpdate {
  checkIntervalSeconds?: number;
  checkTimeoutSeconds?: number;
  maxParallelChecks?: number;
  dataRetentionDays?: number;
  adminPassword?: string;
}

export interface PreviewMatch {
  message: string;
  count: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
