import { api } from './client';
import type { TeamResponse } from '../types';

export interface TeamMiniResponse {
  id: number;
  name: string;
  users: { id: number; name: string }[];
}

export const teamsApi = {
  // Igual que POST /teams/search real: paginado, con busqueda por nombre.
  search: (page: number, size: number, search?: string) =>
    api.post<{ content: TeamResponse[]; totalElements: number }>('/teams/search', { page, size, search }),
  mini: () => api.get<TeamMiniResponse[]>('/teams/mini'),
  getById: (id: number) => api.get<TeamResponse>(`/teams/${id}`),
  create: (
    name: string,
    description: string | undefined,
    userIds: number[],
    assetIds: number[],
    locationIds: number[],
    partIds: number[],
  ) => api.post<TeamResponse>('/teams', { name, description, userIds, assetIds, locationIds, partIds }),
  // Igual que PATCH /teams/{id} real: SOLO nombre, descripcion y miembros --
  // activos/ubicaciones no se pueden cambiar aca, solo se definen al crear.
  update: (id: number, name: string, description: string | undefined, userIds: number[]) =>
    api.patch<TeamResponse>(`/teams/${id}`, { name, description, userIds }),
  delete: (id: number) => api.delete<void>(`/teams/${id}`),
};
