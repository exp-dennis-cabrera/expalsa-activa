import { api } from './client';
import type { MaterialRequest, MaterialRequestStatus } from '../types';

export interface MaterialRequestItemInput {
  partId: number;
  quantity: number;
}

export const materialRequestsApi = {
  listForWorkOrder: (workOrderId: number) => api.get<MaterialRequest[]>(`/material-requests/work-order/${workOrderId}`),
  create: (workOrderId: number, items: MaterialRequestItemInput[], notes?: string) =>
    api.post<MaterialRequest>('/material-requests', { workOrderId, items, notes }),
  decide: (
    id: number,
    status: MaterialRequestStatus,
    options?: { rejectionReason?: string; approvedQuantitiesByItemId?: Record<number, number> },
  ) =>
    api.patch<MaterialRequest>(`/material-requests/${id}/decide`, {
      status,
      rejectionReason: options?.rejectionReason,
      approvedQuantitiesByItemId: options?.approvedQuantitiesByItemId,
      decidedByErp: 'Manual (sin ERP conectado todavía)',
    }),
};
