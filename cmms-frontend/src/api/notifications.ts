import { api } from './client';
import type { AppNotification, PageResponse } from '../types';

export const notificationsApi = {
  list: (page = 0) => api.get<PageResponse<AppNotification>>(`/notifications?page=${page}&size=25`),
  unreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),
  getById: (id: number) => api.get<AppNotification>(`/notifications/${id}`),
  markAsRead: (id: number) => api.patch<void>(`/notifications/${id}/read`),
  markAllAsRead: () => api.patch<void>('/notifications/read-all'),
};
