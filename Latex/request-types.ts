import type { RequestStatus } from '@/lib/constants'

/**
 * Заявка на обслуживание
 */
export interface ServiceRequest {
  id: string
  customer_id: string
  vehicle_id: string
  manager_id: string
  technician_id: string | null
  status: RequestStatus
  description: string
  notes: string | null
  created_at: string
  updated_at: string
}

/**
 * Заявка с развернутой информацией
 */
export interface ServiceRequestDetail extends ServiceRequest {
  customer?: {
    id: string
    full_name: string
    phone: string
    email: string
  }
  vehicle?: {
    id: string
    make: string
    model: string
    year: number
    license_plate: string
  }
  manager?: {
    id: string
    full_name: string
  }
  technician?: {
    id: string
    full_name: string
  } | null
}

export type RequestListSortBy = 'created_at' | 'updated_at' | 'status'
export type RequestListSortDirection = 'asc' | 'desc'

export interface RequestListQueryParams {
  search?: string
  statuses?: RequestStatus[]
  limit?: number
  offset?: number
  sortBy?: RequestListSortBy
  sortDirection?: RequestListSortDirection
}

export interface RequestListResult {
  items: ServiceRequestDetail[]
  totalCount: number
}

/**
 * Данные для создания заявки
 */
export interface CreateRequestDto {
  customer_id: string
  vehicle_id: string
  description: string
  notes?: string
}

/**
 * Данные для обновления заявки
 */
export interface UpdateRequestDto {
  customer_id?: string
  vehicle_id?: string
  description?: string
  notes?: string
  technician_id?: string | null
}

/**
 * Данные для изменения статуса
 */
export interface ChangeStatusDto {
  status: RequestStatus
  notes?: string
}

/**
 * Комментарий к заявке (запись о работе)
 */
export interface RequestComment {
  id: string
  request_id: string
  author_id: string
  content: string
  created_at: string
}

/**
 * Комментарий с данными автора
 */
export interface RequestCommentWithAuthor extends RequestComment {
  author?: {
    id: string
    full_name: string
  }
}
