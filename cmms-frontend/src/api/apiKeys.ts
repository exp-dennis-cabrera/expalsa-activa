import { api } from './client';

export interface ApiKeyItem {
  id: number;
  label: string;
  userName: string;
  lastUsed: string | null;
}

export interface CreatedApiKey {
  id: number;
  label: string;
  /** El codigo en claro. Solo llega al crearla, nunca despues. */
  code: string;
}

export const apiKeysApi = {
  list: () => api.get<ApiKeyItem[]>('/api-keys'),
  create: (label: string) => api.post<CreatedApiKey>('/api-keys', { label }),
  delete: (id: number) => api.delete<void>(`/api-keys/${id}`),
};
