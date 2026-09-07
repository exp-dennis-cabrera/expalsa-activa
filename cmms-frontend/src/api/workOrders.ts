import { api } from './client';
import type { CalendarEvent, CreateWorkOrderRequest, PageResponse, WorkOrder, WorkOrderPriority, WorkOrderStatus } from '../types';

export interface WorkOrderFilters {
  statuses?: WorkOrderStatus[];
  priorities?: WorkOrderPriority[];
  search?: string;
  page?: number;
  size?: number;
}

export function buildQuery(filters: WorkOrderFilters): string {
  const params = new URLSearchParams();
  if (filters.statuses && filters.statuses.length > 0) params.set('status', filters.statuses.join(','));
  if (filters.priorities && filters.priorities.length > 0) params.set('priority', filters.priorities.join(','));
  if (filters.search) params.set('search', filters.search);
  params.set('page', String(filters.page ?? 0));
  params.set('size', String(filters.size ?? 20));
  params.set('sort', 'createdAt,desc');
  return params.toString();
}

export const workOrdersApi = {
  list: (filters: WorkOrderFilters = {}) =>
    api.get<PageResponse<WorkOrder>>(`/work-orders?${buildQuery(filters)}`),
  getById: (id: number) => api.get<WorkOrder>(`/work-orders/${id}`),
  // Igual que GET /work-orders/urgent real: cuantas vencen en <=2 dias y
  // siguen abiertas. Alimenta la insignia roja del menu lateral.
  urgentCount: () => api.get<{ count: number }>('/work-orders/urgent'),
  create: (data: CreateWorkOrderRequest) => api.post<WorkOrder>('/work-orders', data),
  update: (id: number, data: CreateWorkOrderRequest) => api.put<WorkOrder>(`/work-orders/${id}`, data),
  updateStatus: (id: number, status: WorkOrderStatus) =>
    api.patch<WorkOrder>(`/work-orders/${id}/status`, { status }),
  archive: (id: number) => api.patch<void>(`/work-orders/${id}/archive`),
  copy: (id: number) => api.post<WorkOrder>(`/work-orders/${id}/copy`),
  emailContractor: (id: number) => api.post<void>(`/work-orders/${id}/email-contractor`),
  getCalendarEvents: (start: string, end: string) =>
    api.get<CalendarEvent[]>(`/work-orders/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`),
  delete: (id: number) => api.delete<void>(`/work-orders/${id}`),
  downloadReport: async (id: number) => {
    const token = localStorage.getItem('cmms_access_token');
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    // La ruta real es /work-orders/report/{id}, igual que el original.
    // Antes se pedia /{id}/report y devolvia 404.
    const response = await fetch(`${API_BASE_URL}/work-orders/report/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error('No se pudo generar el reporte');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `work-order-${id}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
