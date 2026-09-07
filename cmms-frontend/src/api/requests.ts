import { api } from './client';
import type { RequestItem, WorkOrder, WorkOrderPriority, WorkOrderType, AssetStatus } from '../types';

export interface RequestPayload {
  title: string;
  description?: string;
  priority?: WorkOrderPriority;
  type?: WorkOrderType;
  categoryId?: number;
  assetId?: number;
  locationId?: number;
  teamId?: number;
  dueDate?: string;
  estimatedDurationMinutes?: number;
  contact?: string;
}

export const requestsApi = {
  list: () => api.get<RequestItem[]>('/requests'),
  getById: (id: number) => api.get<RequestItem>(`/requests/${id}`),
  create: (data: RequestPayload) => api.post<RequestItem>('/requests', data),
  update: (id: number, data: RequestPayload) => api.patch<RequestItem>(`/requests/${id}`, data),
  approve: (id: number, primaryAssigneeId?: number, assetStatus?: AssetStatus) =>
    api.patch<WorkOrder>(`/requests/${id}/approve`, { primaryAssigneeId, assetStatus }),
  cancel: (id: number, reason: string) => api.patch<RequestItem>(`/requests/${id}/cancel`, { reason }),
  delete: (id: number) => api.delete<void>(`/requests/${id}`),
  pendingCount: () => api.get<{ count: number }>('/requests/pending-count'),
};
