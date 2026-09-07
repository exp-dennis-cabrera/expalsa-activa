import { api, uploadFile, downloadFile } from './client';
import type { AssetResponse, FileAttachment, FloorPlanEntry, LocationResponse, LocationSummary, WorkOrder } from '../types';

export interface LocationPayload {
  name: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  imageUrl?: string;
  parentLocationId?: number;
  assignedUserIds?: number[];
  vendorIds?: number[];
  teamIds?: number[];
}

export interface LocationPage {
  content: LocationResponse[];
  totalPages: number;
  totalElements: number;
}

export const locationsApi = {
  list: () => api.get<LocationSummary[]>('/locations'),
  hierarchy: () => api.get<LocationResponse[]>('/locations/hierarchy'),
  // Igual proposito que POST /locations/search real: paginado, con detalle completo.
  search: (page: number, size: number, search?: string) => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (search) params.set('search', search);
    return api.get<LocationPage>(`/locations/search?${params.toString()}`);
  },
  // Igual que GET /locations/children/{id} real: id=0 son las raiz, cualquier otro id trae sus hijos directos.
  children: (parentId: number) => api.get<LocationResponse[]>(`/locations/children/${parentId}`),
  getById: (id: number) => api.get<LocationResponse>(`/locations/${id}`),
  export: () => downloadFile('/locations/export', 'ubicaciones.csv'),
  create: (data: LocationPayload) => api.post<LocationResponse>('/locations', data),
  update: (id: number, data: LocationPayload) => api.patch<LocationResponse>(`/locations/${id}`, data),
  delete: (id: number) => api.delete<void>(`/locations/${id}`),
  getAssets: (id: number) => api.get<AssetResponse[]>(`/locations/${id}/assets`),
  getWorkOrders: (id: number) => api.get<WorkOrder[]>(`/locations/${id}/work-orders`),
  getFiles: (id: number) => api.get<FileAttachment[]>(`/locations/${id}/files`),
  uploadFile: (id: number, file: File) => uploadFile<FileAttachment>(`/locations/${id}/files`, file),
  getFloorPlans: (id: number) => api.get<FloorPlanEntry[]>(`/locations/${id}/floor-plans`),
  createFloorPlan: (id: number, name: string, area?: number, imageUrl?: string) =>
    api.post<FloorPlanEntry>(`/locations/${id}/floor-plans`, { name, area, imageUrl }),
  deleteFloorPlan: (floorPlanId: number) => api.delete<void>(`/locations/floor-plans/${floorPlanId}`),
};
