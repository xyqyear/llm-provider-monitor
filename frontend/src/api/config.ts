import type { GlobalConfig, GlobalConfigUpdate } from '../types';
import { apiGet, apiPut } from './index';

export async function getConfig(): Promise<GlobalConfig> {
  return apiGet<GlobalConfig>('/config');
}

export async function updateConfig(config: GlobalConfigUpdate): Promise<void> {
  await apiPut('/config', config);
}

export async function verifyPassword(password: string): Promise<{
  valid: boolean;
  passwordSet: boolean;
}> {
  const response = await fetch('/api/config/auth', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Admin-Password': password,
    },
  });
  const data = await response.json();
  return {
    valid: data.valid,
    passwordSet: data.password_set,
  };
}
