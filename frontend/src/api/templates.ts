import type { RequestTemplate, RequestTemplateCreate, RequestTemplateUpdate } from '../types';
import { apiDelete, apiGet, apiPost, apiPut } from './index';

export async function getTemplates(): Promise<RequestTemplate[]> {
  return apiGet('/templates');
}

export async function getTemplate(id: number): Promise<RequestTemplate> {
  return apiGet(`/templates/${id}`);
}

export async function createTemplate(data: RequestTemplateCreate): Promise<RequestTemplate> {
  return apiPost('/templates', data);
}

export async function updateTemplate(id: number, data: RequestTemplateUpdate): Promise<RequestTemplate> {
  return apiPut(`/templates/${id}`, data);
}

export async function deleteTemplate(id: number): Promise<{ message: string }> {
  return apiDelete(`/templates/${id}`);
}
