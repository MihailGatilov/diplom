import type { NavigationGuardNext, RouteLocationNormalized } from 'vue-router'
import { useAuthStore } from '../store'
import type { UserRole } from '@/lib/constants'

/**
 * Guard для проверки роли пользователя
 */
export function createRoleGuard(allowedRoles: UserRole[]) {
  return async (
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next: NavigationGuardNext
  ) => {
    const authStore = useAuthStore()

    if (!authStore.isInitialized) {
      await authStore.initialize()
    }

    if (!authStore.isAuthenticated) {
      next({ name: 'login', query: { redirect: to.fullPath } })
      return
    }

    const userRole = authStore.userRole
    if (userRole && allowedRoles.includes(userRole)) {
      next()
    } else {
      next({ name: 'forbidden' })
    }
  }
}

/**
 * Проверка наличия определенной роли у текущего пользователя
 */
export function hasRole(role: UserRole): boolean {
  const authStore = useAuthStore()
  return authStore.userRole === role
}

/**
 * Проверка наличия одной из ролей у текущего пользователя
 */
export function hasAnyRole(roles: UserRole[]): boolean {
  const authStore = useAuthStore()
  return authStore.userRole ? roles.includes(authStore.userRole) : false
}
