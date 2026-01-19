import type { PaginatedResponse, ProbeHistory, StatusCategory, TimelineBatchResponse, TimelinePoint } from '../types';
import { apiGet, apiPost } from './index';

export async function getProbeHistory(
  providerId: number,
  modelId: number,
  page = 1,
  pageSize = 50
): Promise<PaginatedResponse<ProbeHistory>> {
  return apiGet<PaginatedResponse<ProbeHistory>>(
    `/probe/history/${providerId}/${modelId}?page=${page}&page_size=${pageSize}`
  );
}

export async function getTimeline(
  providerId: number,
  modelId: number,
  hours = 24,
  aggregation: 'none' | 'hour' | '6hour' | 'day' = 'none'
): Promise<TimelinePoint[]> {
  return apiGet<TimelinePoint[]>(
    `/probe/timeline/${providerId}/${modelId}?hours=${hours}&aggregation=${aggregation}`
  );
}

export async function getTimelineBatch(
  hours: number,
  aggregation: 'none' | 'hour' | '6hour' | 'day',
  providerIds?: number[],
  modelIds?: number[],
  statusCategories?: StatusCategory[]
): Promise<TimelineBatchResponse> {
  const params = new URLSearchParams();
  params.append('hours', hours.toString());
  params.append('aggregation', aggregation);

  if (providerIds && providerIds.length > 0) {
    params.append('provider_ids', providerIds.join(','));
  }
  if (modelIds && modelIds.length > 0) {
    params.append('model_ids', modelIds.join(','));
  }
  if (statusCategories && statusCategories.length > 0) {
    params.append('status_categories', statusCategories.join(','));
  }

  return apiGet<TimelineBatchResponse>(`/probe/timeline/batch?${params.toString()}`);
}

export async function triggerProbe(
  providerId: number,
  modelId: number
): Promise<{
  statusId: number;
  statusName: string;
  statusCategory: string;
  latencyMs: number | null;
  message: string | null;
}> {
  return apiPost(`/probe/trigger/${providerId}/${modelId}`);
}
