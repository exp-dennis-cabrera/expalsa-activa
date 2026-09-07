import { api } from './client';
import type { PartSummary } from '../types';

export const partsApi = {
  list: () => api.get<PartSummary[]>('/parts'),
  create: (data: { name: string; erpSku?: string; quantity?: number; cost?: number }) =>
    api.post<PartSummary>('/parts', data),
};
