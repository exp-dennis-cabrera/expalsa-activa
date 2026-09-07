import { api } from './client';
import type { WorkloadOverview, UnscheduledWorkOrders, ShiftDay, ShiftException, WorkOrder } from '../types';

export const workloadApi = {
  getOverview: (startDate: string, endDate: string, userIds?: number[]) => {
    const params = new URLSearchParams({ startDate, endDate });
    if (userIds && userIds.length > 0) userIds.forEach((id) => params.append('userIds', String(id)));
    return api.get<WorkloadOverview>(`/workload/overview?${params.toString()}`);
  },
  getUnscheduled: () => api.get<UnscheduledWorkOrders>('/workload/unscheduled'),
  schedule: (workOrderId: number, localDate: string | null, primaryUserId?: number, estimatedDurationHours?: number) =>
    api.patch<WorkOrder>(`/workload/work-orders/${workOrderId}/schedule`, {
      localDate,
      primaryUserId,
      estimatedDurationHours,
    }),
  getShift: (userId: number) => api.get<ShiftDay[]>(`/workload/shifts/${userId}`),
  // Excepciones de turno: fechas puntuales que mandan sobre el turno
  // semanal (vacaciones, feriados, media jornada).
  getShiftExceptions: (userId: number) =>
    api.get<ShiftException[]>(`/workload/shifts/${userId}/exceptions`),
  saveShiftException: (userId: number, data: Omit<ShiftException, 'id'>) =>
    api.post<ShiftException>(`/workload/shifts/${userId}/exceptions`, data),
  deleteShiftException: (exceptionId: number) =>
    api.delete<void>(`/workload/shifts/exceptions/${exceptionId}`),
  updateShift: (userId: number, days: ShiftDay[]) =>
    api.put<ShiftDay[]>(`/workload/shifts/${userId}`, { days }),
};
