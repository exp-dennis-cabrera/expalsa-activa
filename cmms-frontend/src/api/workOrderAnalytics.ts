import { api } from './client';

export interface DateRangeInput {
  start: string;
  end: string;
}

export interface WOStats {
  total: number;
  complete: number;
  compliant: number;
  avgCycleTimeDays: number;
  mttaHours: number;
}

export interface WOStatuses {
  open: number;
  onHold: number;
  inProgress: number;
  complete: number;
}

export interface WOIncompleteStats {
  total: number;
  averageAgeDays: number;
}

export interface WOStatusesByDate extends WOStatuses {
  date: string;
}

export interface WOHours {
  estimated: number;
  actual: number;
}

export interface WOStatsByPriority {
  high: { count: number; estimatedHours: number };
  medium: { count: number; estimatedHours: number };
  low: { count: number; estimatedHours: number };
  none: { count: number; estimatedHours: number };
}

export const workOrderAnalyticsApi = {
  getOverview: (range: DateRangeInput) => api.post<WOStats>('/analytics/work-orders/overview', range),
  getStatuses: (range: DateRangeInput) => api.post<WOStatuses>('/analytics/work-orders/statuses', range),
  getIncompleteOverview: (range: DateRangeInput) => api.post<WOIncompleteStats>('/analytics/work-orders/incomplete-overview', range),
  getIncompleteByPriority: (range: DateRangeInput) => api.post<WOStatsByPriority>('/analytics/work-orders/incomplete-by-priority', range),
  getStatusesByDate: (range: DateRangeInput) => api.post<WOStatusesByDate[]>('/analytics/work-orders/statuses-by-date', range),
  getHours: (range: DateRangeInput) => api.post<WOHours>('/analytics/work-orders/hours', range),
};
