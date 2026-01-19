import type { ProbeHistory, TimelinePoint } from '../types';
import { apiGet, apiPost } from './index';

export async function getProbeHistory(
  providerId: number,
  modelId: number,
  limit = 100,
  offset = 0
): Promise<ProbeHistory[]> {
  return apiGet<ProbeHistory[]>(
    `/probe/history/${providerId}/${modelId}?limit=${limit}&offset=${offset}`
  );
}

export async function getTimeline(
  providerId: number,
  modelId: number,
  hours = 24,
  aggregation: 'none' | 'hour' | 'day' = 'none'
): Promise<TimelinePoint[]> {
  return apiGet<TimelinePoint[]>(
    `/probe/timeline/${providerId}/${modelId}?hours=${hours}&aggregation=${aggregation}`
  );
}

export async function triggerProbe(
  providerId: number,
  modelId: number
): Promise<{
  statusCode: number;
  statusName: string;
  statusCategory: string;
  latencyMs: number | null;
  message: string | null;
}> {
  return apiPost(`/probe/trigger/${providerId}/${modelId}`);
}
