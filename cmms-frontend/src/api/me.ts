import { api, uploadFile } from './client';

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

export interface RoleInfo {
  id: number;
  name: string;
  code: string | null;
  description: string | null;
  createPermissions: PermissionEntity[];
  viewPermissions: PermissionEntity[];
  viewOtherPermissions: PermissionEntity[];
  editOtherPermissions: PermissionEntity[];
  deleteOtherPermissions: PermissionEntity[];
}

// Igual estructura que UserResponseDTO real: el rol viene anidado
// completo (con sus 5 conjuntos de permisos), no aplanado.
export interface MyProfile {
  id: number;
  firstName: string | null;
  lastName: string | null;
  email: string;
  phone: string | null;
  jobTitle: string | null;
  avatarUrl: string | null;
  mfaEnabled: boolean;
  role: RoleInfo | null;
}

export interface MySettings {
  emailNotified: boolean;
  emailUpdatesForWorkOrders: boolean;
  emailUpdatesForRequests: boolean;
}

export interface WorkOrdersOverview {
  created: number;
  completed: number;
}

export const meApi = {
  // Igual que GET /auth/me real -- vive en /auth, no en /users/me.
  get: () => api.get<MyProfile>('/auth/me'),
  // Igual que PATCH /users/{id} real: se actualiza el propio perfil con su
  // propio ID, no una ruta especial "/me".
  update: (userId: number, data: Partial<{ firstName: string; lastName: string; phone: string; jobTitle: string }>) =>
    api.patch<MyProfile>(`/users/${userId}`, data),
  uploadAvatar: (file: File) => uploadFile<MyProfile>('/users/me/avatar', file),
  // Igual que POST /auth/updatepwd real.
  changePassword: (oldPassword: string, newPassword: string) =>
    api.post<void>('/auth/updatepwd', { oldPassword, newPassword }),
  getSettings: () => api.get<MySettings>('/users/me/settings'),
  updateSettings: (data: Partial<MySettings>) => api.patch<MySettings>('/users/me/settings', data),
  getWorkOrdersOverview: () => api.get<WorkOrdersOverview>('/users/me/work-orders-overview'),
  // Igual que DELETE /auth real.
  deleteAccount: () => api.delete<void>('/auth'),
};
