import { api, uploadFile } from './client';
import type { FileAttachment } from '../types';

export const filesApi = {
  list: (workOrderId: number) => api.get<FileAttachment[]>(`/work-orders/${workOrderId}/files`),
  upload: (workOrderId: number, file: File) =>
    uploadFile<FileAttachment>(`/work-orders/${workOrderId}/files`, file),
  delete: (workOrderId: number, fileId: number) =>
    api.delete<void>(`/work-orders/${workOrderId}/files/${fileId}`),
};
