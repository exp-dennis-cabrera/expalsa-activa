import { api } from './client';
import type { CategorySummary } from '../types';

export const categoriesApi = {
  list: (type: string = 'WORK_ORDER') => api.get<CategorySummary[]>(`/categories?type=${type}`),
  create: (name: string, type: string = 'WORK_ORDER', description?: string, parentId?: number) =>
    api.post<CategorySummary>('/categories', { name, description, type, parentId }),
  update: (id: number, name: string, description?: string, parentId?: number) =>
    api.put<CategorySummary>(`/categories/${id}`, { name, description, parentId }),
  delete: (id: number) => api.delete<void>(`/categories/${id}`),
};
