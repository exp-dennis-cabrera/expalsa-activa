import { api } from './client';

export interface OrganizationSettings {
  readingDeadlineHour: number;
  timezone: string;
  /** Horarios en formato "HH:mm:ss". */
  dayShiftStart: string;
  dayShiftEnd: string;
  nightShiftStart: string;
  nightShiftEnd: string;
}

export const organizationSettingsApi = {
  get: () => api.get<OrganizationSettings>('/settings/organization'),
  update: (data: Partial<OrganizationSettings>) =>
    api.patch<OrganizationSettings>('/settings/organization', data),
};
