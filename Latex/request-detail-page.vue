<template>
  <div class="request-detail-page">
    <div class="page-header">
      <Button
        icon="pi pi-arrow-left"
        label="Назад"
        class="p-button-text"
        @click="router.back()"
      />
    </div>

    <Card v-if="isLoading">
      <template #content>
        <ProgressSpinner />
        <p class="text-center">Загрузка заявки...</p>
      </template>
    </Card>

    <Card v-else-if="error">
      <template #content>
        <Message severity="error" :closable="false">{{ error }}</Message>
      </template>
    </Card>

    <div v-else-if="selectedRequest" class="request-details">
      <Card>
        <template #title>
          <div class="card-title-row">
            <span>Заявка #{{ selectedRequest.id.substring(0, 8) }}</span>
            <div class="action-buttons">
              <Button
                v-if="canEditRequest"
                label="Редактировать"
                icon="pi pi-pencil"
                class="p-button-outlined"
                :disabled="isActionLoading"
                @click="showEditDialog = true"
              />
              <Button
                v-if="canSubmit"
                label="Отправить"
                icon="pi pi-send"
                :loading="isActionLoading"
                @click="handleSubmit"
              />
              <Button
                v-if="canAssignTechnician"
                label="Назначить мастера"
                icon="pi pi-user-plus"
                class="p-button-outlined"
                :disabled="isActionLoading"
                @click="showAssignDialog = true"
              />
              <Button
                v-if="canTakeRequest"
                label="Взять в работу"
                icon="pi pi-play"
                :loading="isActionLoading"
                @click="handleTakeRequest"
              />
              <Button
                v-if="canStartWork"
                label="Начать работу"
                icon="pi pi-play"
                :loading="isActionLoading"
                @click="handleStartWork"
              />
              <Button
                v-if="canCompleteWork"
                label="Завершить"
                icon="pi pi-check"
                :disabled="isActionLoading"
                @click="showCompleteDialog = true"
              />
              <Button
                v-if="canCancelRequest"
                label="Отменить"
                icon="pi pi-times"
                severity="secondary"
                class="p-button-outlined"
                :disabled="isActionLoading"
                @click="showCancelDialog = true"
              />
            </div>
          </div>
        </template>

        <template #content>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Статус</label>
              <Tag
                :value="getStatusLabel(selectedRequest.status)"
                :severity="getStatusSeverity(selectedRequest.status)"
              />
            </div>

            <div class="detail-item">
              <label>Клиент</label>
              <p>{{ selectedRequest.customer?.full_name }}</p>
              <p class="text-secondary">{{ selectedRequest.customer?.phone }}</p>
            </div>

            <div class="detail-item">
              <label>Автомобиль</label>
              <p>{{ selectedRequest.vehicle?.make }} {{ selectedRequest.vehicle?.model }}</p>
              <p class="text-secondary">{{ selectedRequest.vehicle?.license_plate }}</p>
            </div>

            <div class="detail-item full-width">
              <label>Описание</label>
              <p>{{ selectedRequest.description }}</p>
            </div>
          </div>
        </template>
      </Card>

      <Card class="comments-card">
        <template #title>Комментарии и записи о работе</template>
        <template #content>
          <ul class="comments-list">
            <li v-for="comment in requestComments" :key="comment.id" class="comment-item">
              <div class="comment-meta">
                <span class="comment-author">{{ comment.author?.full_name ?? 'Пользователь' }}</span>
                <span class="comment-date">{{ formatDate(comment.created_at) }}</span>
              </div>
              <p class="comment-content">{{ comment.content }}</p>
            </li>
          </ul>

          <div v-if="canAddComment" class="comment-form">
            <label for="new-comment">Добавить комментарий</label>
            <Textarea
              id="new-comment"
              v-model="newCommentText"
              rows="3"
              placeholder="Например: потребовались доп. запчасти, выполнена дополнительная работа..."
              :disabled="isActionLoading"
            />
            <Button
              label="Отправить"
              icon="pi pi-send"
              :disabled="!newCommentText.trim()"
              :loading="isActionLoading"
              @click="handleAddComment"
            />
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useRequestStore } from '@/domains/requests/store'
import { useAuth } from '@/domains/auth/composables/useAuth'
import { useRequestWorkflow } from '@/domains/requests/composables/useRequestWorkflow'
import { useRequestStatusPermissions } from '@/domains/requests/composables/useRequestStatusPermissions'
import { REQUEST_STATUS_LABELS, RequestStatus } from '@/lib/constants'
import { useToast } from 'primevue/usetoast'

const route = useRoute()
const router = useRouter()
const requestStore = useRequestStore()
const { currentUser, userRole } = useAuth()
const toast = useToast()

const requestId = computed(() => route.params.id as string)
const selectedRequest = computed(() => requestStore.selectedRequest)
const requestComments = computed(() => requestStore.requestComments)
const isLoading = computed(() => requestStore.isLoading)
const error = computed(() => requestStore.error)

const permissionContext = computed(() => ({
  request: selectedRequest.value,
  userId: currentUser.value?.id ?? null,
  userRole: userRole.value ?? null
}))

const {
  canSubmit,
  canAssignTechnician,
  canTakeRequest,
  canStartWork,
  canCompleteWork,
  canCancelRequest,
  canEditRequest,
  canAddComment
} = useRequestStatusPermissions(permissionContext)

const {
  submitRequest,
  startWork,
  completeWork,
  cancelRequest
} = useRequestWorkflow()

const isActionLoading = ref(false)
const showAssignDialog = ref(false)
const showEditDialog = ref(false)
const showCompleteDialog = ref(false)
const showCancelDialog = ref(false)
const newCommentText = ref('')

async function handleSubmit() {
  if (!selectedRequest.value) return
  isActionLoading.value = true
  try {
    await submitRequest(selectedRequest.value.id)
    toast.add({ severity: 'success', summary: 'Готово', detail: 'Заявка отправлена', life: 3000 })
  } finally {
    isActionLoading.value = false
  }
}

async function handleTakeRequest() {
  if (!selectedRequest.value || !currentUser.value) return
  isActionLoading.value = true
  try {
    await requestStore.takeRequest(selectedRequest.value.id, currentUser.value.id)
    toast.add({ severity: 'success', summary: 'Готово', detail: 'Заявка взята в работу', life: 3000 })
  } finally {
    isActionLoading.value = false
  }
}

async function handleStartWork() {
  if (!selectedRequest.value) return
  isActionLoading.value = true
  try {
    await startWork(selectedRequest.value.id)
    toast.add({ severity: 'success', summary: 'Готово', detail: 'Работа начата', life: 3000 })
  } finally {
    isActionLoading.value = false
  }
}

async function handleCompleteWork() {
  if (!selectedRequest.value) return
  isActionLoading.value = true
  try {
    await completeWork(selectedRequest.value.id)
    showCompleteDialog.value = false
    toast.add({ severity: 'success', summary: 'Готово', detail: 'Заявка завершена', life: 3000 })
  } finally {
    isActionLoading.value = false
  }
}

async function handleCancelRequest() {
  if (!selectedRequest.value) return
  isActionLoading.value = true
  try {
    await cancelRequest(selectedRequest.value.id)
    showCancelDialog.value = false
    toast.add({ severity: 'success', summary: 'Готово', detail: 'Заявка отменена', life: 3000 })
  } finally {
    isActionLoading.value = false
  }
}

async function handleAddComment() {
  if (!selectedRequest.value || !newCommentText.value.trim() || !currentUser.value) return
  isActionLoading.value = true
  try {
    await requestStore.addComment(selectedRequest.value.id, newCommentText.value.trim(), currentUser.value.id)
    newCommentText.value = ''
  } finally {
    isActionLoading.value = false
  }
}

function getStatusLabel(status: string) {
  return REQUEST_STATUS_LABELS[status as RequestStatus]
}

function getStatusSeverity(status: string) {
  const severities: Record<string, string> = {
    draft: 'secondary',
    submitted: 'info',
    assigned: 'warning',
    in_progress: 'warning',
    on_hold: 'secondary',
    completed: 'success',
    cancelled: 'danger'
  }
  return severities[status] ?? 'secondary'
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('ru-RU')
}

onMounted(async () => {
  await requestStore.loadRequest(requestId.value)
  await requestStore.loadComments(requestId.value)
})
</script>
