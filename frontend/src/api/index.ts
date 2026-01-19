const API_BASE = '/api';

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function snakeToCamel(str: string): string {
  return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function transformKeys<T>(obj: unknown, transformer: (key: string) => string): T {
  if (obj === null || obj === undefined) {
    return obj as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => transformKeys(item, transformer)) as T;
  }
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      result[transformer(key)] = transformKeys(value, transformer);
    }
    return result as T;
  }
  return obj as T;
}

export function toSnakeCase<T>(obj: unknown): T {
  return transformKeys(obj, camelToSnake);
}

export function toCamelCase<T>(obj: unknown): T {
  return transformKeys(obj, snakeToCamel);
}

let adminPassword: string | null = null;

export function setAdminPassword(password: string | null) {
  adminPassword = password;
}

export function getAdminPassword(): string | null {
  return adminPassword;
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (adminPassword) {
    headers['X-Admin-Password'] = adminPassword;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  const data = await response.json();
  return toCamelCase<T>(data);
}

export async function apiGet<T>(endpoint: string): Promise<T> {
  return apiFetch<T>(endpoint);
}

export async function apiPost<T>(endpoint: string, body?: unknown): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: 'POST',
    body: body ? JSON.stringify(toSnakeCase(body)) : undefined,
  });
}

export async function apiPut<T>(endpoint: string, body: unknown): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: 'PUT',
    body: JSON.stringify(toSnakeCase(body)),
  });
}

export async function apiDelete<T>(endpoint: string): Promise<T> {
  return apiFetch<T>(endpoint, {
    method: 'DELETE',
  });
}
