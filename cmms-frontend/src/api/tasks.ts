import { api } from './client';

export type TaskType = 'TEXT' | 'NUMBER' | 'CHECKBOX' | 'METER';

export interface TaskItem {
  id: number;
  label: string;
  type: TaskType;
  orderIndex: number;
  value: string | null;
  completed: boolean;
}

export const tasksApi = {
  listForWorkOrder: (woId: number) => api.get<TaskItem[]>(`/work-orders/${woId}/tasks`),
  createForWorkOrder: (woId: number, label: string, type: TaskType) =>
    api.post<TaskItem>(`/work-orders/${woId}/tasks`, { label, type }),
  listForPM: (pmId: number) => api.get<TaskItem[]>(`/preventive-maintenances/${pmId}/tasks`),
  createForPM: (pmId: number, label: string, type: TaskType) =>
    api.post<TaskItem>(`/preventive-maintenances/${pmId}/tasks`, { label, type }),
  updateValue: (taskId: number, value: string | undefined, completed: boolean | undefined) =>
    api.patch<TaskItem>(`/tasks/${taskId}`, { value, completed }),
  delete: (taskId: number) => api.delete<void>(`/tasks/${taskId}`),
};
