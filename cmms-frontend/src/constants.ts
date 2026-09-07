import type { WorkOrderPriority, WorkOrderStatus, RecurrenceType, RecurrenceBasedOn, AssetStatus, RequestStatus, MaterialRequestStatus } from './types';

export const MATERIAL_REQUEST_STATUS_LABELS: Record<MaterialRequestStatus, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
};

export const MATERIAL_REQUEST_STATUS_COLORS: Record<MaterialRequestStatus, 'warning' | 'success' | 'error'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
};

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  PENDING: 'Pendiente',
  APPROVED: 'Aprobada',
  CANCELLED: 'Rechazada',
};

export const REQUEST_STATUS_COLORS: Record<RequestStatus, 'warning' | 'success' | 'error'> = {
  PENDING: 'warning',
  APPROVED: 'success',
  CANCELLED: 'error',
};

export const ASSET_STATUS_LABELS: Record<AssetStatus, string> = {
  OPERATIONAL: 'Operativo',
  DOWN: 'Averiado',
  MODERNIZATION: 'En modernización',
  STANDBY: 'En espera',
  INSPECTION_SCHEDULED: 'Inspección programada',
  COMMISSIONING: 'Puesta en marcha',
  EMERGENCY_SHUTDOWN: 'Parada de emergencia',
};

export const ASSET_STATUS_COLORS: Record<AssetStatus, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
  OPERATIONAL: 'success',
  DOWN: 'error',
  MODERNIZATION: 'info',
  STANDBY: 'default',
  INSPECTION_SCHEDULED: 'warning',
  COMMISSIONING: 'info',
  EMERGENCY_SHUTDOWN: 'error',
};

export const ASSET_STATUS_ORDER: AssetStatus[] = [
  'OPERATIONAL', 'DOWN', 'MODERNIZATION', 'STANDBY', 'INSPECTION_SCHEDULED', 'COMMISSIONING', 'EMERGENCY_SHUTDOWN',
];

export const RECURRENCE_TYPE_LABELS: Record<RecurrenceType, string> = {
  DAILY: 'Diario',
  WEEKLY: 'Semanal',
  MONTHLY: 'Mensual',
  YEARLY: 'Anual',
};

export const RECURRENCE_BASED_ON_LABELS: Record<RecurrenceBasedOn, string> = {
  SCHEDULED_DATE: 'Fecha programada',
  COMPLETED_DATE: 'Fecha de finalización',
};

export const WEEKDAY_LABELS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  OPEN: 'Abierta',
  IN_PROGRESS: 'En progreso',
  ON_HOLD: 'En espera',
  COMPLETED: 'Completa',
};

export const STATUS_ORDER: WorkOrderStatus[] = ['OPEN', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED'];

// Colores solidos para el boton de estado grande (drawer), inspirados en Atlas:
// azul=abierta, verde=en progreso, ambar=en espera, verde oscuro=completa.
export const STATUS_COLORS: Record<WorkOrderStatus, string> = {
  OPEN: '#5b6df8',
  IN_PROGRESS: '#2fa86f',
  ON_HOLD: '#f2a93b',
  COMPLETED: '#1f7a4d',
};

export const PRIORITY_LABELS: Record<WorkOrderPriority, string> = {
  NONE: 'Ninguna',
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
};

export const PRIORITY_ORDER: WorkOrderPriority[] = ['NONE', 'LOW', 'MEDIUM', 'HIGH'];

export const PRIORITY_COLORS: Record<WorkOrderPriority, { bg: string; text: string }> = {
  NONE: { bg: '#eef0f4', text: '#5b6580' },
  LOW: { bg: '#e3f5eb', text: '#1f7a4d' },
  MEDIUM: { bg: '#fdf0da', text: '#a5720f' },
  HIGH: { bg: '#fde7e0', text: '#b8502f' },
};

// Los 5 roles reales de Atlas CMMS. Debe coincidir con RoleNames.java del backend.
export const ROLE_NAMES = {
  ADMIN: 'ADMIN',
  LIMITED_ADMIN: 'LIMITED_ADMIN',
  TECHNICIAN: 'TECHNICIAN',
  LIMITED_TECHNICIAN: 'LIMITED_TECHNICIAN',
  REQUESTER: 'REQUESTER',
} as const;

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Admin',
  LIMITED_ADMIN: 'Limited Admin',
  TECHNICIAN: 'Technician',
  LIMITED_TECHNICIAN: 'Limited Technician',
  REQUESTER: 'Requester',
};

// Espejo de la matriz de permisos real de Atlas implementada en WorkOrderService.java.
// Se usa solo para adaptar la UI (ocultar botones); el backend es la fuente de verdad.
const CAN_CREATE_OR_EDIT: string[] = [ROLE_NAMES.ADMIN, ROLE_NAMES.LIMITED_ADMIN, ROLE_NAMES.TECHNICIAN];
const CAN_REOPEN: string[] = [ROLE_NAMES.ADMIN, ROLE_NAMES.LIMITED_ADMIN];
const CAN_DELETE: string[] = [ROLE_NAMES.ADMIN];

export function canCreateOrEditWorkOrder(role: string | null): boolean {
  return !!role && CAN_CREATE_OR_EDIT.includes(role);
}

export function canReopenWorkOrder(role: string | null): boolean {
  return !!role && CAN_REOPEN.includes(role);
}

export function canDeleteWorkOrder(role: string | null): boolean {
  return !!role && CAN_DELETE.includes(role);
}
