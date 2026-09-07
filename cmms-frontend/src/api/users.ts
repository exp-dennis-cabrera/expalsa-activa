import { api } from './client';
import type { UserSummary } from '../types';
import type { MyProfile } from './me';

export interface InvitedUserResult {
  email: string;
  acceptUrl: string;
}

export interface PendingInvitation {
  id: number;
  email: string;
  roleId: number;
  roleName: string;
  createdAt: string;
}

export interface UserMini {
  id: number;
  fullName: string;
  email: string;
}

export const usersApi = {
  // Igual que POST /users/search real: paginado, con filtro enabledOnly (true por defecto).
  search: (page: number, size: number, search?: string, enabledOnly = true) =>
    api.post<{ content: UserSummary[]; totalElements: number }>('/users/search', { page, size, search, enabledOnly }),
  mini: (withRequesters = false) =>
    api.get<UserMini[]>(`/users/mini${withRequesters ? '?withRequesters=true' : ''}`),
  getById: (id: number) => api.get<MyProfile>(`/users/${id}`),
  // Igual que PATCH /users/{id} real: NO incluye el rol -- ver updateRole.
  update: (id: number, data: Partial<{ firstName: string; lastName: string; phone: string; jobTitle: string; hourlyRate: number }>) =>
    api.patch<MyProfile>(`/users/${id}`, data),
  // Igual que PATCH /users/{id}/role real: endpoint separado, por seguridad.
  updateRole: (id: number, roleId: number) => api.patch<MyProfile>(`/users/${id}/role`, { roleId }),
  invite: (emails: string[], roleId: number) =>
    api.post<InvitedUserResult[]>('/users/invite', { emails, roleId }),
  disable: (id: number) => api.patch<UserSummary>(`/users/${id}/disable`),
  enable: (id: number) => api.patch<UserSummary>(`/users/${id}/enable`),
  // Igual que PATCH /users/soft-delete/{id} real.
  softDelete: (id: number) => api.patch<UserSummary>(`/users/soft-delete/${id}`),
  lastWeekInvitations: () => api.get<PendingInvitation[]>('/users/invitations/last-week'),
};
