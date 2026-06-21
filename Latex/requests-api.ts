import { supabase } from '@/lib/supabase'
import { callSupabaseRpc } from '@/lib/supabase-rpc'
import type {
  ServiceRequest,
  ServiceRequestDetail,
  CreateRequestDto,
  UpdateRequestDto,
  RequestListQueryParams,
  RequestListResult
} from '../types'
import type { RequestStatus } from '@/lib/constants'

const SERVICE_REQUEST_DETAIL_SELECT = `
  *,
  customer:customers!service_requests_customer_id_fkey (
    id,
    full_name,
    phone,
    email
  ),
  vehicle:vehicles!service_requests_vehicle_id_fkey (
    id,
    make,
    model,
    year,
    license_plate
  ),
  manager:user_profiles!service_requests_manager_id_fkey (
    id,
    full_name
  ),
  technician:user_profiles!service_requests_technician_id_fkey (
    id,
    full_name
  )
`

/**
 * API для работы с заявками.
 * Компоненты и store не обращаются к Supabase напрямую.
 */
export const requestsApi = {
  async getAll(): Promise<ServiceRequestDetail[]> {
    const { data, error } = await supabase
      .from('service_requests')
      .select(SERVICE_REQUEST_DETAIL_SELECT)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data as ServiceRequestDetail[]
  },

  async getById(id: string): Promise<ServiceRequestDetail> {
    const { data, error } = await supabase
      .from('service_requests')
      .select(SERVICE_REQUEST_DETAIL_SELECT)
      .eq('id', id)
      .single()

    if (error) throw error
    return data as ServiceRequestDetail
  },

  async getList(params: RequestListQueryParams = {}): Promise<RequestListResult> {
    const limit = params.limit ?? 20
    const offset = params.offset ?? 0
    const sortBy = params.sortBy ?? 'created_at'
    const sortDirection = params.sortDirection ?? 'desc'

    let query = supabase
      .from('service_requests')
      .select(SERVICE_REQUEST_DETAIL_SELECT, { count: 'exact' })
      .order(sortBy, { ascending: sortDirection === 'asc' })

    if (params.statuses?.length) {
      query = query.in('status', params.statuses)
    }

    if (params.search?.trim()) {
      const search = params.search.trim()
      query = query.or(`description.ilike.%${search}%`)
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1)

    if (error) throw error
    return {
      items: (data ?? []) as ServiceRequestDetail[],
      totalCount: count ?? 0
    }
  },

  async create(requestData: CreateRequestDto, managerId: string): Promise<ServiceRequestDetail> {
    const createdRequest = await callSupabaseRpc<ServiceRequestDetail>('create_service_request', {
      p_customer_id: requestData.customer_id,
      p_vehicle_id: requestData.vehicle_id,
      p_manager_id: managerId,
      p_description: requestData.description,
      p_notes: requestData.notes ?? null
    })

    if (!createdRequest) throw new Error('Не удалось создать заявку')
    return createdRequest
  },

  async update(id: string, requestData: UpdateRequestDto): Promise<ServiceRequest> {
    const patch: Record<string, string | null> = {}
    if (requestData.customer_id !== undefined) patch.customer_id = requestData.customer_id
    if (requestData.vehicle_id !== undefined) patch.vehicle_id = requestData.vehicle_id
    if (requestData.description !== undefined) patch.description = requestData.description
    if (requestData.notes !== undefined) patch.notes = requestData.notes

    const data = await callSupabaseRpc<string>('update_service_request_fields', {
      p_request_id: id,
      p_patch: patch
    })

    if (!data) throw new Error('Не удалось обновить заявку')
    return { id } as ServiceRequest
  },

  async changeStatus(id: string, status: RequestStatus, notes?: string): Promise<ServiceRequest> {
    const data = await callSupabaseRpc<string>('change_service_request_status', {
      p_request_id: id,
      p_new_status: status,
      p_notes: notes ?? null,
      p_set_notes: notes !== undefined
    })

    if (!data) throw new Error('Не удалось изменить статус заявки')
    return { id } as ServiceRequest
  },

  async takeRequest(id: string): Promise<ServiceRequestDetail> {
    const data = await callSupabaseRpc<string>('take_service_request', {
      p_request_id: id
    })

    if (!data) {
      throw new Error('Заявка уже взята в работу другим мастером или недоступна')
    }
    return this.getById(id)
  },

  async assignTechnician(id: string, technicianId: string): Promise<ServiceRequest> {
    const data = await callSupabaseRpc<string>('assign_service_request_technician', {
      p_request_id: id,
      p_technician_id: technicianId
    })

    if (!data) throw new Error('Не удалось назначить мастера')
    return { id } as ServiceRequest
  }
}
