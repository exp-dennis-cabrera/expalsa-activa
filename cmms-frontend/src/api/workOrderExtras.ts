import { api } from './client';
import type { AdditionalCostEntry, TimeLogEntry, WorkOrderComment, WorkOrderLink, WorkOrderPartEntry } from '../types';

export interface WorkOrderHistoryEntry {
  id: number;
  name: string;
  userName: string | null;
  createdAt: string;
}

export const workOrderExtrasApi = {
  // Igual que editLabor real: corregir las horas de un registro de tiempo.
  updateTimeLog: (workOrderId: number, logId: number, hours: number) =>
    api.patch<TimeLogEntry>(`/work-orders/${workOrderId}/time-logs/${logId}`, { hours }),
  // Igual que GET /work-order-histories/work-order/{id} real.
  history: (workOrderId: number) =>
    api.get<WorkOrderHistoryEntry[]>(`/work-orders/${workOrderId}/history`),
  listTimeLogs: (workOrderId: number) => api.get<TimeLogEntry[]>(`/work-orders/${workOrderId}/time-logs`),
  addTimeLog: (workOrderId: number, hours: number, logDate?: string) =>
    api.post<TimeLogEntry>(`/work-orders/${workOrderId}/time-logs`, { hours, logDate }),
  deleteTimeLog: (workOrderId: number, logId: number) =>
    api.delete<void>(`/work-orders/${workOrderId}/time-logs/${logId}`),
  startTimer: (workOrderId: number) => api.post<TimeLogEntry>(`/work-orders/${workOrderId}/timer/start`),
  stopTimer: (workOrderId: number) => api.post<TimeLogEntry>(`/work-orders/${workOrderId}/timer/stop`),

  listCosts: (workOrderId: number) => api.get<AdditionalCostEntry[]>(`/work-orders/${workOrderId}/costs`),
  addCost: (workOrderId: number, description: string, cost: number, category?: string) =>
    api.post<AdditionalCostEntry>(`/work-orders/${workOrderId}/costs`, { description, cost, category }),
  deleteCost: (workOrderId: number, costId: number) =>
    api.delete<void>(`/work-orders/${workOrderId}/costs/${costId}`),

  listParts: (workOrderId: number) => api.get<WorkOrderPartEntry[]>(`/work-orders/${workOrderId}/parts`),
  addPart: (workOrderId: number, partId: number, quantityUsed: number) =>
    api.post<WorkOrderPartEntry>(`/work-orders/${workOrderId}/parts`, { partId, quantityUsed }),
  removePart: (workOrderId: number, workOrderPartId: number) =>
    api.delete<void>(`/work-orders/${workOrderId}/parts/${workOrderPartId}`),

  listComments: (workOrderId: number) => api.get<WorkOrderComment[]>(`/work-orders/${workOrderId}/comments`),
  addComment: (workOrderId: number, content: string, fileIds?: number[]) =>
    api.post<WorkOrderComment>(`/work-orders/${workOrderId}/comments`, { content, fileIds }),
  deleteComment: (workOrderId: number, commentId: number) =>
    api.delete<void>(`/work-orders/${workOrderId}/comments/${commentId}`),

  listLinks: (workOrderId: number) => api.get<WorkOrderLink[]>(`/work-orders/${workOrderId}/links`),
  addLink: (workOrderId: number, linkedWorkOrderId: number) =>
    api.post<WorkOrderLink>(`/work-orders/${workOrderId}/links`, { linkedWorkOrderId }),
  removeLink: (workOrderId: number, linkId: number) =>
    api.delete<void>(`/work-orders/${workOrderId}/links/${linkId}`),
};
