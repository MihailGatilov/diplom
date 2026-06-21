import { RequestStatus, REQUEST_STATUS_TRANSITIONS } from '@/lib/constants'
import { useRequestStore } from '../store'
import { useAuthStore } from '@/domains/auth/store'
import { canUserChangeStatus } from '../workflow/status-permissions'

/**
 * Composable для работы с workflow заявок (переходы статусов с проверкой прав).
 */
export function useRequestWorkflow() {
  const requestStore = useRequestStore()
  const authStore = useAuthStore()

  function canTransition(from: RequestStatus, to: RequestStatus): boolean {
    const allowedTransitions = REQUEST_STATUS_TRANSITIONS[from]
    return allowedTransitions.includes(to)
  }

  function getAvailableTransitions(currentStatus: RequestStatus): RequestStatus[] {
    return REQUEST_STATUS_TRANSITIONS[currentStatus]
  }

  function isFinalStatus(status: RequestStatus): boolean {
    return status === RequestStatus.COMPLETED || status === RequestStatus.CANCELLED
  }

  function canAssignTechnicianByStatus(status: RequestStatus): boolean {
    return status === RequestStatus.SUBMITTED || status === RequestStatus.ASSIGNED
  }

  /**
   * Изменить статус заявки с проверкой графа переходов и прав текущего пользователя.
   */
  async function changeStatus(requestId: string, newStatus: RequestStatus, notes?: string) {
    const request =
      requestStore.selectedRequest?.id === requestId
        ? requestStore.selectedRequest
        : requestStore.requests.find(r => r.id === requestId)

    if (!request) {
      throw new Error('Request not found')
    }

    if (!canTransition(request.status as RequestStatus, newStatus)) {
      throw new Error(`Cannot transition from ${request.status} to ${newStatus}`)
    }

    const userId = authStore.session?.user?.id ?? authStore.session?.profile?.id ?? null
    const userRole = authStore.session?.profile?.role ?? null
    if (!userId || !userRole) {
      throw new Error('User not authenticated')
    }

    const allowed = canUserChangeStatus(
      request.status as RequestStatus,
      newStatus,
      { manager_id: request.manager_id, technician_id: request.technician_id },
      { userId, userRole }
    )
    if (!allowed) {
      throw new Error('You do not have permission to perform this status change')
    }

    await requestStore.changeRequestStatus(requestId, newStatus, notes)
  }

  async function submitRequest(requestId: string) {
    await changeStatus(requestId, RequestStatus.SUBMITTED)
  }

  async function startWork(requestId: string) {
    await changeStatus(requestId, RequestStatus.IN_PROGRESS)
  }

  async function completeWork(requestId: string, notes?: string) {
    await changeStatus(requestId, RequestStatus.COMPLETED, notes)
  }

  async function pauseWork(requestId: string, notes?: string) {
    await changeStatus(requestId, RequestStatus.ON_HOLD, notes)
  }

  async function resumeWork(requestId: string) {
    await changeStatus(requestId, RequestStatus.IN_PROGRESS)
  }

  async function cancelRequest(requestId: string, notes?: string) {
    await changeStatus(requestId, RequestStatus.CANCELLED, notes)
  }

  return {
    canTransition,
    getAvailableTransitions,
    isFinalStatus,
    canAssignTechnicianByStatus,
    changeStatus,
    submitRequest,
    startWork,
    completeWork,
    pauseWork,
    resumeWork,
    cancelRequest
  }
}
