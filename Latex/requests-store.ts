import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { requestsApi } from './api/requests-api'
import { requestCommentsApi } from './api/request-comments-api'
import type {
  ServiceRequestDetail,
  CreateRequestDto,
  UpdateRequestDto,
  RequestCommentWithAuthor,
  RequestListQueryParams
} from './types'
import type { RequestStatus } from '@/lib/constants'

/**
 * Store для управления заявками.
 * Хранит доменное состояние и делегирует доступ к данным API-слою.
 */
export const useRequestStore = defineStore('requests', () => {
  const requests = ref<ServiceRequestDetail[]>([])
  const selectedRequest = ref<ServiceRequestDetail | null>(null)
  const requestComments = ref<RequestCommentWithAuthor[]>([])
  const totalCount = ref(0)
  const listParams = ref<RequestListQueryParams | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const latestListRequestId = ref(0)

  const requestsCount = computed(() => requests.value.length)

  const activeRequests = computed(() =>
    requests.value.filter(r => r.status !== 'completed' && r.status !== 'cancelled')
  )

  const requestsByStatus = computed(() => {
    const grouped: Record<string, ServiceRequestDetail[]> = {}
    requests.value.forEach(request => {
      if (!grouped[request.status]) {
        grouped[request.status] = []
      }
      grouped[request.status].push(request)
    })
    return grouped
  })

  async function loadRequestsList(params: RequestListQueryParams = {}) {
    const requestId = ++latestListRequestId.value
    isLoading.value = true
    error.value = null

    try {
      const result = await requestsApi.getList(params)
      if (requestId === latestListRequestId.value) {
        requests.value = result.items
        totalCount.value = result.totalCount
        listParams.value = { ...params }
      }
    } catch (e) {
      if (requestId === latestListRequestId.value) {
        error.value = e instanceof Error ? e.message : 'Failed to load requests list'
      }
      throw e
    } finally {
      if (requestId === latestListRequestId.value) {
        isLoading.value = false
      }
    }
  }

  async function loadRequest(id: string) {
    isLoading.value = true
    error.value = null

    try {
      selectedRequest.value = await requestsApi.getById(id)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load request'
      throw e
    } finally {
      isLoading.value = false
    }
  }

  function syncUpdatedRequest(id: string, updated: ServiceRequestDetail) {
    if (selectedRequest.value?.id === id) {
      selectedRequest.value = updated
    }
    const idx = requests.value.findIndex(r => r.id === id)
    if (idx !== -1) {
      requests.value = requests.value.map(r => (r.id === id ? updated : r))
    }
  }

  async function createRequest(requestData: CreateRequestDto, managerId: string) {
    const createdRequest = await requestsApi.create(requestData, managerId)
    requests.value = [
      createdRequest,
      ...requests.value.filter(request => request.id !== createdRequest.id)
    ]
    totalCount.value = requests.value.length
    return createdRequest
  }

  async function updateRequest(id: string, requestData: UpdateRequestDto) {
    await requestsApi.update(id, requestData)
    const updated = await requestsApi.getById(id)
    syncUpdatedRequest(id, updated)
    return updated
  }

  async function changeRequestStatus(id: string, status: RequestStatus, notes?: string) {
    await requestsApi.changeStatus(id, status, notes)
    const updated = await requestsApi.getById(id)
    syncUpdatedRequest(id, updated)
  }

  async function assignTechnician(id: string, technicianId: string) {
    await requestsApi.assignTechnician(id, technicianId)
    const updated = await requestsApi.getById(id)
    syncUpdatedRequest(id, updated)
  }

  async function loadComments(requestId: string) {
    requestComments.value = await requestCommentsApi.getByRequestId(requestId)
  }

  async function addComment(requestId: string, content: string, authorId: string) {
    const newComment = await requestCommentsApi.add(requestId, content, authorId)
    requestComments.value = [...requestComments.value, newComment]
    return newComment
  }

  return {
    requests,
    selectedRequest,
    requestComments,
    totalCount,
    listParams,
    isLoading,
    error,
    requestsCount,
    activeRequests,
    requestsByStatus,
    loadRequestsList,
    loadRequest,
    createRequest,
    updateRequest,
    changeRequestStatus,
    assignTechnician,
    loadComments,
    addComment
  }
})
