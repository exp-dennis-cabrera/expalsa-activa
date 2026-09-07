export type WorkOrderStatus = 'OPEN' | 'IN_PROGRESS' | 'ON_HOLD' | 'COMPLETED';
export type WorkOrderPriority = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
export type WorkOrderType = 'CORRECTIVE' | 'PREVENTIVE' | 'INSPECTION';

export interface AssigneeSummary {
  id: number;
  fullName: string;
}

export interface WorkOrder {
  id: number;
  title: string;
  description: string | null;
  /** Igual que workOrder.image real: la primera imagen adjunta a la orden. */
  imageUrl: string | null;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  type: WorkOrderType;
  categoryId: number | null;
  categoryName: string | null;
  assetId: number | null;
  assetName: string | null;
  locationId: number | null;
  locationName: string | null;
  locationAddress: string | null;
  createdById: number | null;
  createdByName: string | null;
  filesCount: number;
  requestedByName: string | null;
  vendorId: number | null;
  vendorName: string | null;
  teamId: number | null;
  teamName: string | null;
  primaryAssigneeId: number | null;
  primaryAssigneeName: string | null;
  assignees: AssigneeSummary[];
  dueDate: string | null;
  estimatedStartDate: string | null;
  estimatedDurationMinutes: number | null;
  requiresSignature: boolean | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkOrderRequest {
  title: string;
  description?: string;
  priority?: WorkOrderPriority;
  type?: WorkOrderType;
  assetId?: number;
  assetStatus?: string;
  locationId?: number;
  categoryId?: number;
  dueDate?: string;
  estimatedStartDate?: string;
  estimatedDurationMinutes?: number;
  requiresSignature?: boolean;
  vendorId?: number;
  teamId?: number;
  primaryAssigneeId?: number;
  additionalAssigneeIds?: number[];
  taskLabels?: string[];
}

export interface CategorySummary {
  id: number;
  name: string;
  description: string | null;
  type: string;
  /** Categoria padre: "Agua dulce" cuelga de "Agua". Null si es de primer nivel. */
  parentId?: number | null;
  parentName?: string | null;
}

export interface LocationIdName {
  id: number;
  name: string;
}

export interface LocationResponse {
  id: number;
  customId: string | null;
  name: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  imageUrl: string | null;
  parentLocationId: number | null;
  parentLocationName: string | null;
  assignedUsers: LocationIdName[];
  teams: LocationIdName[];
  vendors: LocationIdName[];
  createdAt: string;
}

export interface FloorPlanEntry {
  id: number;
  name: string;
  area: number | null;
  imageUrl: string | null;
}

export interface LocationSummary {
  id: number;
  name: string;
}

export interface UserSummary {
  id: number;
  fullName: string;
  email: string;
  roleName: string | null;
  hourlyRate: number | null;
  phone: string | null;
  jobTitle: string | null;
  status: string | null;
}

export interface TeamResponse {
  id: number;
  name: string;
  description: string | null;
  createdById: number | null;
  members: UserSummary[];
  assets: { id: number; name: string }[];
  locations: LocationSummary[];
  parts: PartSummary[];
}

export interface TimeLogEntry {
  id: number;
  userId: number;
  userName: string;
  hours: number | null;
  logDate: string | null;
  cost: number | null;
  running: boolean;
  startedAt: string | null;
  createdAt: string;
}

export interface VendorSummary {
  id: number;
  companyName: string;
  vendorType: string | null;
  rate: number | null;
}

export interface AdditionalCostEntry {
  id: number;
  description: string;
  cost: number;
  category: string | null;
  createdById: number | null;
  createdByName: string | null;
  createdAt: string;
}

export interface WorkOrderPartEntry {
  id: number;
  partId: number;
  partName: string;
  quantityUsed: number;
  unitCost: number | null;
  totalCost: number | null;
}

export interface PartSummary {
  id: number;
  name: string;
  erpSku: string | null;
  quantity: number;
  cost: number | null;
}

export type NotificationType =
  | 'INFO'
  | 'ASSET'
  | 'WORK_ORDER'
  | 'PART'
  | 'METER'
  | 'LOCATION'
  | 'TEAM'
  | 'REQUEST'
  | 'PURCHASE_ORDER';

// Igual estructura que la Notification real: notificationType indica el
// modulo y resourceId el ID dentro de ese modulo -- juntos determinan a
// que pantalla navegar al hacer clic.
export interface AppNotification {
  id: number;
  notificationType: NotificationType;
  title: string;
  message: string | null;
  resourceId: number | null;
  seen: boolean;
  createdAt: string;
}

export interface CalendarEvent {
  id: number;
  title: string;
  date: string | null;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
}

export interface WorkloadWorkOrderItem {
  id: number;
  title: string;
  status: WorkOrderStatus;
  estimatedDurationHours: number | null;
  estimatedStartDate: string | null;
  dueDate: string | null;
}

export interface WorkloadUserDay {
  userId: number;
  fullName: string;
  capacityMinutes: number;
  allocatedMinutes: number;
  workOrders: WorkloadWorkOrderItem[];
}

export interface WorkloadDay {
  date: string;
  dayOfWeek: string;
  teamCapacityMinutes: number;
  teamAllocatedMinutes: number;
  users: WorkloadUserDay[];
}

export interface WorkloadOverview {
  startDate: string;
  endDate: string;
  teamCapacityMinutes: number;
  teamAllocatedMinutes: number;
  days: WorkloadDay[];
}

export interface UnscheduledWorkOrders {
  statusCounts: Record<string, number>;
  overdueCount: number;
  dueSoonCount: number;
  workOrders: WorkloadWorkOrderItem[];
}

/** Excepcion de turno: una fecha concreta manda sobre el turno semanal. */
export interface ShiftException {
  id?: number;
  exceptionDate: string;
  availabilityMinutes: number;
  enabled: boolean;
  reason?: string | null;
}

export interface ShiftDay {
  dayOfWeek: string;
  enabled: boolean;
  startTime: string | null; // "HH:mm:ss"
  endTime: string | null;
  durationMinutes: number;
  crossesMidnight: boolean;
}

export type RecurrenceType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'YEARLY';
export type RecurrenceBasedOn = 'SCHEDULED_DATE' | 'COMPLETED_DATE';

export interface ScheduleData {
  disabled: boolean;
  startsOn: string;
  frequency: number;
  endsOn: string | null;
  dueDateDelay: number | null;
  recurrenceType: RecurrenceType;
  recurrenceBasedOn: RecurrenceBasedOn;
  daysOfWeek: number[];
}

export interface PreventiveMaintenance {
  id: number;
  customId: string | null;
  name: string;
  title: string;
  description: string | null;
  priority: WorkOrderPriority;
  categoryId: number | null;
  categoryName: string | null;
  assetId: number | null;
  assetName: string | null;
  locationId: number | null;
  locationName: string | null;
  teamId: number | null;
  teamName: string | null;
  primaryAssigneeId: number | null;
  primaryAssigneeName: string | null;
  estimatedDurationMinutes: number | null;
  daysBeforeNotification: number | null;
  schedule: ScheduleData;
  lastGeneratedAt: string | null;
  nextDueAt: string | null;
  createdAt: string;
}

export type RequestStatus = 'PENDING' | 'APPROVED' | 'CANCELLED';

export interface RequestItem {
  id: number;
  customId: string | null;
  title: string;
  description: string | null;
  priority: WorkOrderPriority;
  type: WorkOrderType | null;
  categoryId: number | null;
  categoryName: string | null;
  assetId: number | null;
  assetName: string | null;
  locationId: number | null;
  locationName: string | null;
  teamId: number | null;
  teamName: string | null;
  dueDate: string | null;
  estimatedDurationMinutes: number | null;
  estimatedStartDate: string | null;
  createdById: number | null;
  createdByName: string | null;
  contact: string | null;
  status: RequestStatus;
  cancelled: boolean;
  cancellationReason: string | null;
  workOrderId: number | null;
  createdAt: string;
}

export type MaterialRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface MaterialRequestItem {
  id: number;
  partId: number;
  partName: string;
  partErpSku: string | null;
  requestedQuantity: number;
  approvedQuantity: number | null;
}

export interface MaterialRequest {
  id: number;
  workOrderId: number;
  requestedById: number | null;
  requestedByName: string | null;
  status: MaterialRequestStatus;
  notes: string | null;
  erpRequestId: string | null;
  rejectionReason: string | null;
  decidedByErp: string | null;
  decidedAt: string | null;
  items: MaterialRequestItem[];
  createdAt: string;
}

export interface WorkOrderComment {
  id: number;
  content: string;
  authorId: number;
  authorName: string;
  createdAt: string;
  /** Adjuntos del comentario. */
  files?: { id: number; fileName: string; downloadUrl: string }[];
  /**
   * true = comentario automatico generado por un cambio de estado.
   * Igual que el campo "system" de CommentShowDTO real: no se puede
   * editar ni borrar.
   */
  system?: boolean;
}

export interface WorkOrderLink {
  linkId: number;
  workOrderId: number;
  title: string;
  status: WorkOrderStatus;
}

export interface FileAttachment {
  id: number;
  fileName: string;
  downloadUrl: string;
  contentType: string | null;
  sizeBytes: number | null;
  uploadedByName: string | null;
  createdAt: string;
}

export type AssetStatus =
  | 'OPERATIONAL'
  | 'DOWN'
  | 'MODERNIZATION'
  | 'STANDBY'
  | 'INSPECTION_SCHEDULED'
  | 'COMMISSIONING'
  | 'EMERGENCY_SHUTDOWN';

export interface IdName {
  id: number;
  name: string;
}

export interface AssetDeprecation {
  purchasePrice: number | null;
  purchaseDate: string | null;
  residualValue: number | null;
  usefulLife: string | null;
  rate: number | null;
  currentValue: number | null;
}

export interface AssetResponse {
  id: number;
  customId: string | null;
  name: string;
  description: string | null;
  status: AssetStatus;
  categoryId: number | null;
  categoryName: string | null;
  serialNumber: string | null;
  model: string | null;
  manufacturer: string | null;
  power: string | null;
  area: string | null;
  barCode: string | null;
  nfcId: string | null;
  acquisitionDate: string | null;
  acquisitionCost: number | null;
  warrantyExpirationDate: string | null;
  inServiceDate: string | null;
  additionalInfos: string | null;
  imageUrl: string | null;
  locationId: number | null;
  locationName: string | null;
  parentAssetId: number | null;
  parentAssetName: string | null;
  primaryUserId: number | null;
  primaryUserName: string | null;
  assignedUsers: IdName[];
  teams: IdName[];
  vendors: IdName[];
  parts: IdName[];
  deprecation: AssetDeprecation | null;
  createdAt: string;
  updatedAt: string;
  /** Si tiene subactivos -- el arbol lo usa para saber si se expande. */
  hasChildren?: boolean;
}

export interface AssetAnalytics {
  mtbfHours: number;
  mttrHours: number;
  downtimeHours: number;
  uptimeHours: number;
  totalCost: number;
}

export interface AssetDowntimeEntry {
  id: number;
  startsOn: string;
  endsOn: string | null;
  durationSeconds: number | null;
}

export interface MeterReadingEntry {
  id: number;
  value: number;
  createdByName: string | null;
  readingDate: string;
  /**
   * Arrastre del equipo que dio esta lectura. Sumado al valor da el
   * acumulado real, para que la grafica sea continua tras un reemplazo.
   */
  deviceOffset?: number;
}

export interface MeterEntry {
  id: number;
  name: string;
  unit: string | null;
  updateFrequencyDays: number;
  lastReading: number | null;
  lastReadingDate: string | null;
  nextReadingDue: string | null;
  pastDue: boolean;
  /** AL_DIA | PENDIENTE | INCUMPLIDO -- estado de la lectura del turno. */
  readingStatus: 'AL_DIA' | 'PENDIENTE' | 'INCUMPLIDO';
  assetId: number | null;
  assetName: string | null;
  locationId: number | null;
  locationName: string | null;
  categoryId: number | null;
  categoryName: string | null;
  createdById: number | null;
  createdByName: string | null;
  imageUrl: string | null;
  assignedUserIds: number[];
  assignedUserNames: string[];
  readings: MeterReadingEntry[];
  createdAt: string;
  /** Equipo responsable: determina quien ve el medidor. */
  teamId?: number | null;
  teamName?: string | null;
  /** true = oculto del listado; sus lecturas se conservan. */
  disabled?: boolean;
  /** Arrastre de equipos anteriores + lectura fisica actual. */
  accumulatedReading?: number | null;
  deviceSerialNumber?: string | null;
  deviceInstalledAt?: string | null;
}

export interface MeterTriggerEntry {
  id: number;
  name: string;
  condition: 'LESS_THAN' | 'GREATER_THAN';
  value: number;
  workOrderTitle: string;
  workOrderDescription: string | null;
  priority: WorkOrderPriority;
  primaryAssigneeId: number | null;
  primaryAssigneeName: string | null;
  waitBeforeDays: number;
  categoryId: number | null;
  categoryName: string | null;
  locationId: number | null;
  locationName: string | null;
  assetId: number | null;
  assetName: string | null;
  teamId: number | null;
  teamName: string | null;
  dueDate: string | null;
  estimatedStartDate: string | null;
  estimatedDurationMinutes: number | null;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  last: boolean;
}

export interface AuthResponse {
  accessToken: string | null;
  refreshToken: string | null;
  tokenType: string | null;
  mfaRequired: boolean;
  mfaChallengeToken: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  organizationName: string;
  email: string;
  password: string;
  firstName: string;
  lastName?: string;
}

export interface ApiError {
  status: number;
  message: string;
  timestamp: string;
}
