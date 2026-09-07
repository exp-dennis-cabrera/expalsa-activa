import { api } from './client';

export type CustomFieldType = 'TEXT' | 'NUMBER' | 'DATE' | 'SELECT' | 'CHECKBOX';
export type CustomFieldEntityType = 'WORK_ORDER' | 'PREVENTIVE_MAINTENANCE' | 'ASSET';

export interface CustomField {
  id: number;
  name: string;
  type: CustomFieldType;
  entityType: CustomFieldEntityType;
  required: boolean;
  copyOnGenerate: boolean;
  options: string[];
}

export interface CustomFieldValue {
  customFieldId: number;
  name: string;
  value: string | null;
}

export const customFieldsApi = {
  list: (entityType: CustomFieldEntityType) => api.get<CustomField[]>(`/custom-fields?entityType=${entityType}`),
  create: (data: Omit<CustomField, 'id'>) => api.post<CustomField>('/custom-fields', data),
  delete: (id: number) => api.delete<void>(`/custom-fields/${id}`),
  getValuesForWorkOrder: (woId: number) => api.get<CustomFieldValue[]>(`/work-orders/${woId}/custom-field-values`),
  setValuesForWorkOrder: (woId: number, values: Record<number, string>) =>
    api.put<void>(`/work-orders/${woId}/custom-field-values`, { values }),
  getValuesForPM: (pmId: number) => api.get<CustomFieldValue[]>(`/preventive-maintenances/${pmId}/custom-field-values`),
  setValuesForPM: (pmId: number, values: Record<number, string>) =>
    api.put<void>(`/preventive-maintenances/${pmId}/custom-field-values`, { values }),
};
