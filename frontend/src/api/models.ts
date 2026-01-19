import type { Model } from '../types';
import { apiDelete, apiGet, apiPost, apiPut } from './index';

export async function getModels(): Promise<Model[]> {
  return apiGet<Model[]>('/models');
}

export async function createModel(model: Partial<Model>): Promise<Model> {
  return apiPost<Model>('/models', model);
}

export async function updateModel(id: number, model: Partial<Model>): Promise<Model> {
  return apiPut<Model>(`/models/${id}`, model);
}

export async function deleteModel(id: number): Promise<void> {
  await apiDelete(`/models/${id}`);
}
