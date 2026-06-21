import { RequestStatus, UserRole, REQUEST_STATUS_TRANSITIONS } from '@/lib/constants'

/**
 * Правило доступа к переходу статуса: какие роли могут выполнить переход
 * и нужны ли дополнительные условия (назначенный мастер, менеджер заявки).
 */
export interface TransitionPermission {
  roles: UserRole[]
  requireAssignedTechnician?: boolean
}

export const REQUEST_STATUS_PERMISSIONS: Partial<
  Record<RequestStatus, Partial<Record<RequestStatus, TransitionPermission>>>
> = {
  [RequestStatus.DRAFT]: {
    [RequestStatus.SUBMITTED]: {
      roles: [UserRole.ADMIN, UserRole.MANAGER]
    },
    [RequestStatus.CANCELLED]: {
      roles: [UserRole.ADMIN, UserRole.MANAGER]
    }
  },
  [RequestStatus.SUBMITTED]: {
    [RequestStatus.ASSIGNED]: {
      roles: [UserRole.ADMIN, UserRole.MANAGER]
    },
    [RequestStatus.CANCELLED]: {
      roles: [UserRole.ADMIN, UserRole.MANAGER]
    }
  },
  [RequestStatus.ASSIGNED]: {
    [RequestStatus.IN_PROGRESS]: {
      roles: [UserRole.ADMIN, UserRole.TECHNICIAN],
      requireAssignedTechnician: true
    },
    [RequestStatus.CANCELLED]: {
      roles: [UserRole.ADMIN, UserRole.MANAGER]
    }
  },
  [RequestStatus.IN_PROGRESS]: {
    [RequestStatus.COMPLETED]: {
      roles: [UserRole.ADMIN, UserRole.TECHNICIAN],
      requireAssignedTechnician: true
    },
    [RequestStatus.ON_HOLD]: {
      roles: [UserRole.ADMIN, UserRole.TECHNICIAN],
      requireAssignedTechnician: true
    }
  },
  [RequestStatus.ON_HOLD]: {
    [RequestStatus.IN_PROGRESS]: {
      roles: [UserRole.ADMIN, UserRole.TECHNICIAN],
      requireAssignedTechnician: true
    }
  }
}

export function isTransitionAllowed(from: RequestStatus, to: RequestStatus): boolean {
  const allowed = REQUEST_STATUS_TRANSITIONS[from]
  return allowed?.includes(to) ?? false
}

export function getTransitionPermission(
  from: RequestStatus,
  to: RequestStatus
): TransitionPermission | null {
  const perStatus = REQUEST_STATUS_PERMISSIONS[from]
  if (!perStatus) return null
  return perStatus[to] ?? null
}

export interface UserContext {
  userId: string
  userRole: UserRole
}

/**
 * Проверка: может ли пользователь выполнить переход (from -> to) для данной заявки.
 */
export function canUserChangeStatus(
  from: RequestStatus,
  to: RequestStatus,
  request: { manager_id: string; technician_id: string | null },
  user: UserContext | null
): boolean {
  if (!user) return false
  if (!isTransitionAllowed(from, to)) return false

  const permission = getTransitionPermission(from, to)
  if (!permission) return user.userRole === UserRole.ADMIN
  if (!permission.roles.includes(user.userRole)) return false

  if (permission.requireAssignedTechnician && user.userRole === UserRole.TECHNICIAN) {
    return request.technician_id === user.userId
  }
  return true
}
