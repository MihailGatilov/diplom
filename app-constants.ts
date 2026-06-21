/**
 * Роли пользователей в системе
 */
export enum UserRole {
  ADMIN = 'admin',
  MANAGER = 'manager',
  TECHNICIAN = 'technician'
}

/**
 * Статусы заявок
 */
export enum RequestStatus {
  DRAFT = 'draft',
  SUBMITTED = 'submitted',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  ON_HOLD = 'on_hold',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

/**
 * Допустимые переходы между статусами заявок
 */
export const REQUEST_STATUS_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  [RequestStatus.DRAFT]: [RequestStatus.SUBMITTED, RequestStatus.CANCELLED],
  [RequestStatus.SUBMITTED]: [RequestStatus.ASSIGNED, RequestStatus.CANCELLED],
  [RequestStatus.ASSIGNED]: [RequestStatus.IN_PROGRESS, RequestStatus.CANCELLED],
  [RequestStatus.IN_PROGRESS]: [RequestStatus.COMPLETED, RequestStatus.ON_HOLD],
  [RequestStatus.ON_HOLD]: [RequestStatus.IN_PROGRESS],
  [RequestStatus.COMPLETED]: [],
  [RequestStatus.CANCELLED]: []
}

/**
 * Метки статусов для отображения
 */
export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  [RequestStatus.DRAFT]: 'Черновик',
  [RequestStatus.SUBMITTED]: 'Отправлена',
  [RequestStatus.ASSIGNED]: 'Назначена',
  [RequestStatus.IN_PROGRESS]: 'В работе',
  [RequestStatus.ON_HOLD]: 'Приостановлена',
  [RequestStatus.COMPLETED]: 'Завершена',
  [RequestStatus.CANCELLED]: 'Отменена'
}

/**
 * Метки ролей для отображения
 */
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'Администратор',
  [UserRole.MANAGER]: 'Менеджер',
  [UserRole.TECHNICIAN]: 'Мастер'
}

/**
 * Типы действий в audit log
 */
export enum AuditAction {
  CREATED = 'created',
  UPDATED = 'updated',
  STATUS_CHANGED = 'status_changed',
  DELETED = 'deleted'
}

/**
 * Типы сущностей для audit log
 */
export enum AuditEntityType {
  SERVICE_REQUEST = 'service_request',
  CUSTOMER = 'customer',
  VEHICLE = 'vehicle',
  USER = 'user'
}
