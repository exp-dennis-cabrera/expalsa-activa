import { api } from './client';

export type PermissionEntity =
  | 'PEOPLE_AND_TEAMS'
  | 'CATEGORIES'
  | 'CATEGORIES_WEB'
  | 'WORK_ORDERS'
  | 'PREVENTIVE_MAINTENANCES'
  | 'ASSETS'
  | 'PARTS_AND_MULTIPARTS'
  | 'PURCHASE_ORDERS'
  | 'METERS'
  | 'VENDORS_AND_CUSTOMERS'
  | 'FILES'
  | 'LOCATIONS'
  | 'SETTINGS'
  | 'REQUESTS'
  | 'ANALYTICS';

export interface RoleResponse {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  usersCount: number;
  createPermissions: PermissionEntity[];
  viewPermissions: PermissionEntity[];
  viewOtherPermissions: PermissionEntity[];
  editOtherPermissions: PermissionEntity[];
  deleteOtherPermissions: PermissionEntity[];
}

export interface RolePayload {
  name: string;
  description?: string;
  createPermissions: PermissionEntity[];
  viewPermissions: PermissionEntity[];
  viewOtherPermissions: PermissionEntity[];
  editOtherPermissions: PermissionEntity[];
  deleteOtherPermissions: PermissionEntity[];
}

export const rolesApi = {
  list: () => api.get<RoleResponse[]>('/roles'),
  getById: (id: number) => api.get<RoleResponse>(`/roles/${id}`),
  create: (data: RolePayload) => api.post<RoleResponse>('/roles', data),
  update: (id: number, data: RolePayload) => api.patch<RoleResponse>(`/roles/${id}`, data),
  delete: (id: number) => api.delete<void>(`/roles/${id}`),
};
