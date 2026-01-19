import type {
  PreviewMatch,
  StatusConfig,
  StatusConfigCreate,
  UnmatchedMessage,
} from '../types';
import { apiDelete, apiGet, apiPost, apiPut } from './index';

export async function getStatusConfigs(): Promise<StatusConfig[]> {
  return apiGet<StatusConfig[]>('/status/configs');
}

export async function createStatusConfig(config: StatusConfigCreate): Promise<StatusConfig> {
  return apiPost<StatusConfig>('/status/configs', config);
}

export async function updateStatusConfig(
  id: number,
  config: Partial<StatusConfigCreate>
): Promise<StatusConfig> {
  return apiPut<StatusConfig>(`/status/configs/${id}`, config);
}

export async function deleteStatusConfig(id: number): Promise<void> {
  await apiDelete(`/status/configs/${id}`);
}

export async function previewRegexMatches(regex: string): Promise<PreviewMatch[]> {
  return apiPost<PreviewMatch[]>('/status/configs/preview', { regex });
}

export async function applyConfigToHistory(
  configId: number
): Promise<{ message: string; updatedCount: number }> {
  return apiPost(`/status/configs/${configId}/apply`);
}

export async function getUnmatchedMessages(): Promise<UnmatchedMessage[]> {
  return apiGet<UnmatchedMessage[]>('/status/unmatched');
}
