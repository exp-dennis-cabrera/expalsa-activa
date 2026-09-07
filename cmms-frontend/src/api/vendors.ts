import { api } from './client';
import type { VendorSummary } from '../types';

export const vendorsApi = {
  list: () => api.get<VendorSummary[]>('/vendors'),
  create: (companyName: string, vendorType?: string, rate?: number) =>
    api.post<VendorSummary>('/vendors', { companyName, vendorType, rate }),
};
