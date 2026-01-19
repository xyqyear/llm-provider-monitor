import type {
  ProviderAdmin,
  ProviderCreate,
  ProviderModelConfig,
  ProviderUpdate,
  ProviderWithModels,
} from '../types';
import { apiDelete, apiGet, apiPost, apiPut } from './index';

export async function getProvidersStatus(): Promise<ProviderWithModels[]> {
  return apiGet<ProviderWithModels[]>('/providers');
}

export async function getProvidersAdmin(): Promise<ProviderAdmin[]> {
  return apiGet<ProviderAdmin[]>('/providers/admin');
}

export async function createProvider(provider: ProviderCreate): Promise<ProviderAdmin> {
  return apiPost<ProviderAdmin>('/providers', provider);
}

export async function updateProvider(id: number, provider: ProviderUpdate): Promise<ProviderAdmin> {
  return apiPut<ProviderAdmin>(`/providers/${id}`, provider);
}

export async function deleteProvider(id: number): Promise<void> {
  await apiDelete(`/providers/${id}`);
}

export async function configureProviderModels(
  providerId: number,
  models: ProviderModelConfig[]
): Promise<void> {
  await apiPost(`/providers/${providerId}/models`, models);
}
