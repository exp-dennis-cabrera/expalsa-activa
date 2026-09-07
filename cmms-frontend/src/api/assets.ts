import { api, uploadFile, downloadFile } from './client';
import type { AssetResponse, AssetAnalytics, AssetDowntimeEntry, MeterEntry, MeterTriggerEntry, AssetStatus, PageResponse, WorkOrder, FileAttachment, WorkOrderPriority } from '../types';

export interface AssetFilters {
  search?: string;
  status?: string;
  locationId?: number;
  page?: number;
  size?: number;
}

function buildQuery(filters: AssetFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.locationId) params.set('locationId', String(filters.locationId));
  params.set('page', String(filters.page ?? 0));
  params.set('size', String(filters.size ?? 100));
  params.set('sort', 'createdAt,desc');
  return params.toString();
}

export interface DeprecationPayload {
  purchasePrice?: number;
  purchaseDate?: string;
  residualValue?: number;
  usefulLife?: string;
  rate?: number;
  currentValue?: number;
}

export interface AssetPayload {
  name: string;
  description?: string;
  status?: AssetStatus;
  categoryId?: number;
  serialNumber?: string;
  model?: string;
  manufacturer?: string;
  power?: string;
  area?: string;
  barCode?: string;
  nfcId?: string;
  acquisitionDate?: string;
  acquisitionCost?: number;
  warrantyExpirationDate?: string;
  inServiceDate?: string;
  additionalInfos?: string;
  imageUrl?: string;
  locationId?: number;
  parentAssetId?: number;
  primaryUserId?: number;
  assignedUserIds?: number[];
  teamIds?: number[];
  vendorIds?: number[];
  partIds?: number[];
  deprecation?: DeprecationPayload;
}

export interface MeterTriggerPayload {
  name: string;
  condition: 'LESS_THAN' | 'GREATER_THAN';
  value: number;
  workOrderTitle: string;
  workOrderDescription?: string;
  priority: WorkOrderPriority;
  primaryAssigneeId?: number;
  waitBeforeDays?: number;
  categoryId?: number;
  locationId?: number;
  assetId?: number;
  teamId?: number;
  dueDate?: string;
  estimatedStartDate?: string;
  estimatedDurationMinutes?: number;
}

export interface AssetCostSummary {
  laborCost: number;
  partsCost: number;
  additionalCost: number;
  totalCost: number;
  workOrderCount: number;
  completedWorkOrderCount: number;
}

export interface PartSummary {
  id: number;
  name: string;
  erpSku?: string;
  quantity?: number;
  cost?: number;
}

export interface MeterDeviceEntry {
  id: number;
  serialNumber: string | null;
  offsetValue: number;
  installedAt: string;
  removedAt: string | null;
  replacedByName: string | null;
  notes: string | null;
  readingCount: number;
}

export const assetsApi = {
  list: (filters: AssetFilters = {}) =>
    api.get<PageResponse<AssetResponse>>(`/assets?${buildQuery(filters)}`),
  hierarchy: () => api.get<AssetResponse[]>('/assets/hierarchy'),
  getById: (id: number) => api.get<AssetResponse>(`/assets/${id}`),
  create: (data: AssetPayload) => api.post<AssetResponse>('/assets', data),
  update: (id: number, data: AssetPayload) => api.put<AssetResponse>(`/assets/${id}`, data),
  delete: (id: number) => api.delete<void>(`/assets/${id}`),
  getWorkOrderHistory: (id: number) => api.get<WorkOrder[]>(`/assets/${id}/work-orders`),
  getCostSummary: (id: number) => api.get<AssetCostSummary>(`/assets/${id}/cost-summary`),
  getAnalytics: (id: number, start: string, end: string) =>
    api.get<AssetAnalytics>(`/assets/${id}/analytics?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}`),
  getDowntimes: (id: number) => api.get<AssetDowntimeEntry[]>(`/assets/${id}/downtimes`),
  getMeters: (id: number) => api.get<MeterEntry[]>(`/assets/${id}/meters`),
  createMeter: (id: number, name: string, unit: string | undefined, updateFrequencyDays: number | undefined, assignedUserIds?: number[]) =>
    api.post<MeterEntry>(`/assets/${id}/meters`, { name, unit, updateFrequencyDays, assignedUserIds }),
  addMeterReading: (meterId: number, value: number) =>
    api.post<MeterEntry>(`/assets/meters/${meterId}/readings`, { value }),
  getMeterTriggers: (meterId: number) => api.get<MeterTriggerEntry[]>(`/assets/meters/${meterId}/triggers`),
  createMeterTrigger: (meterId: number, payload: MeterTriggerPayload) =>
    api.post<MeterTriggerEntry>(`/assets/meters/${meterId}/triggers`, payload),
  deleteMeterTrigger: (triggerId: number) => api.delete<void>(`/assets/meters/triggers/${triggerId}`),
  listAllMeters: () => api.get<MeterEntry[]>('/meters'),
  createMeterStandalone: (assetId: number, name: string, unit: string | undefined, updateFrequencyDays: number | undefined, assignedUserIds?: number[], categoryId?: number, locationId?: number, teamId?: number) =>
    api.post<MeterEntry>(`/meters?assetId=${assetId}`, { name, unit, updateFrequencyDays, assignedUserIds, categoryId, locationId, teamId }),
  updateMeter: (meterId: number, name: string, unit: string | undefined, updateFrequencyDays: number | undefined, assignedUserIds?: number[], categoryId?: number, locationId?: number, teamId?: number) =>
    api.patch<MeterEntry>(`/meters/${meterId}`, { name, unit, updateFrequencyDays, assignedUserIds, categoryId, locationId, teamId }),
  /** Historial de equipos fisicos del medidor (pestaña "Reemplazos"). */
  getMeterDevices: (meterId: number) =>
    api.get<MeterDeviceEntry[]>(`/meters/${meterId}/devices`),
  /**
   * Registra el reemplazo del equipo fisico. El contador nuevo arranca en
   * cero, pero el acumulado del medidor continua.
   */
  replaceMeterDevice: (meterId: number, serialNumber?: string, notes?: string) => {
    const p = new URLSearchParams();
    if (serialNumber) p.set('serialNumber', serialNumber);
    if (notes) p.set('notes', notes);
    return api.post<MeterEntry>(`/meters/${meterId}/replace-device?${p.toString()}`, {});
  },
  /** Habilita o deshabilita un medidor. Requiere permiso de eliminar. */
  setMeterDisabled: (meterId: number, disabled: boolean) =>
    api.patch<MeterEntry>(`/meters/${meterId}/disabled?disabled=${disabled}`, {}),
  deleteMeter: (meterId: number) => api.delete<void>(`/meters/${meterId}`),
  updateReading: (readingId: number, value: number) => api.put<MeterEntry>(`/meters/readings/${readingId}`, { value }),
  deleteReading: (readingId: number) => api.delete<void>(`/meters/readings/${readingId}`),
  updateMeterTrigger: (triggerId: number, payload: MeterTriggerPayload) =>
    api.put<MeterTriggerEntry>(`/meters/triggers/${triggerId}`, payload),
  /** Reporte de estado de medicion: todas las lecturas con quien y cuando. */
  exportMeterReadingsCsv: () => downloadFile('/meters/readings/export', 'lecturas-medidores.csv'),
  /** Busqueda paginada con filtros -- necesaria con 200 medidores. */
  searchMeters: (criteria: {
    search?: string;
    assetId?: number;
    locationId?: number;
    categoryId?: number;
    pastDueOnly?: boolean;
    page?: number;
    size?: number;
  }) => api.post<{ content: MeterEntry[]; totalElements: number }>('/meters/search', criteria),
  exportMetersCsv: async () => {
    const token = localStorage.getItem('cmms_access_token');
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    const response = await fetch(`${API_BASE_URL}/meters/export`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) throw new Error('No se pudo exportar');
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'medidores.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
  importMetersCsv: async (file: File) => {
    const token = localStorage.getItem('cmms_access_token');
    const formData = new FormData();
    formData.append('file', file);
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';
    const res = await fetch(`${API_BASE_URL}/meters/import`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });
    if (!res.ok) throw new Error('No se pudo importar el archivo');
    return res.json() as Promise<{ created: number; failed: number }>;
  },
  /** Repuestos asociados al activo (pestaña "Repuestos" del detalle). */
  getParts: (id: number) => api.get<PartSummary[]>(`/assets/${id}/parts`),
  getFiles: (id: number) => api.get<FileAttachment[]>(`/assets/${id}/files`),
  uploadFile: (id: number, file: File) => uploadFile<FileAttachment>(`/assets/${id}/files`, file),
};
