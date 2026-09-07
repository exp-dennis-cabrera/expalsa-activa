import { api } from './client';
import type { PreventiveMaintenance, WorkOrder, WorkOrderPriority, RecurrenceType, RecurrenceBasedOn } from '../types';

export interface PreventiveMaintenancePayload {
  name: string;
  title: string;
  description?: string;
  priority?: WorkOrderPriority;
  categoryId?: number;
  assetId?: number;
  locationId?: number;
  teamId?: number;
  primaryAssigneeId?: number;
  estimatedDurationMinutes?: number;
  daysBeforeNotification?: number;
  schedule: {
    startsOn: string;
    frequency: number;
    endsOn?: string;
    dueDateDelay?: number;
    recurrenceType: RecurrenceType;
    recurrenceBasedOn: RecurrenceBasedOn;
    daysOfWeek?: number[];
  };
}

export const preventiveMaintenanceApi = {
  list: () => api.get<PreventiveMaintenance[]>('/preventive-maintenances'),
  getById: (id: number) => api.get<PreventiveMaintenance>(`/preventive-maintenances/${id}`),
  create: (data: PreventiveMaintenancePayload) => api.post<PreventiveMaintenance>('/preventive-maintenances', data),
  update: (id: number, data: PreventiveMaintenancePayload) =>
    api.put<PreventiveMaintenance>(`/preventive-maintenances/${id}`, data),
  delete: (id: number) => api.delete<void>(`/preventive-maintenances/${id}`),
  setEnabled: (id: number, enabled: boolean) =>
    api.patch<PreventiveMaintenance>(`/preventive-maintenances/${id}/enabled`, { enabled }),
  getWorkOrderHistory: (id: number) => api.get<WorkOrder[]>(`/preventive-maintenances/${id}/work-orders`),
  generateNow: (id: number) => api.post<WorkOrder>(`/preventive-maintenances/${id}/generate-now`),
  getCalendarEvents: (start: string, end: string) =>
    api.get<{ preventiveMaintenanceId: number; title: string; date: string }[]>(
      `/preventive-maintenances/calendar?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`,
    ),
  exportCsv: async () => {
    const token = localStorage.getItem('cmms_access_token');
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    const response = await fetch(`${API_BASE_URL}/preventive-maintenances/export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error('No se pudo exportar');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'mantenimiento_preventivo.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
  importCsv: async (file: File) => {
    const token = localStorage.getItem('cmms_access_token');
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${import.meta.env.VITE_API_URL ?? 'http://localhost:8080'}/preventive-maintenances/import`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) throw new Error('No se pudo importar el archivo');
    return res.json() as Promise<{ created: number; failed: number }>;
  },
};
