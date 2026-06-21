import { createRouter, createWebHistory } from 'vue-router'
import type { RouteRecordRaw } from 'vue-router'
import { authGuard } from './guards'
import { createRoleGuard } from '@/domains/auth/guards/role-guard'
import { UserRole } from '@/lib/constants'

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/domains/auth/views/LoginPage.vue'),
    meta: { layout: 'auth' }
  },
  {
    path: '/',
    redirect: '/dashboard',
    meta: { requiresAuth: true }
  },
  {
    path: '/dashboard',
    name: 'dashboard',
    component: () => import('@/views/DashboardPage.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/requests',
    name: 'requests',
    component: () => import('@/domains/requests/views/RequestsPage.vue'),
    meta: { requiresAuth: true },
    beforeEnter: createRoleGuard([UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHNICIAN])
  },
  {
    path: '/requests/:id',
    name: 'request-detail',
    component: () => import('@/domains/requests/views/RequestDetailPage.vue'),
    meta: { requiresAuth: true },
    beforeEnter: createRoleGuard([UserRole.ADMIN, UserRole.MANAGER, UserRole.TECHNICIAN])
  },
  {
    path: '/customers',
    name: 'customers',
    component: () => import('@/domains/customers/views/CustomersPage.vue'),
    meta: { requiresAuth: true },
    beforeEnter: createRoleGuard([UserRole.ADMIN, UserRole.MANAGER])
  },
  {
    path: '/vehicles',
    name: 'vehicles',
    component: () => import('@/domains/vehicles/views/VehiclesPage.vue'),
    meta: { requiresAuth: true },
    beforeEnter: createRoleGuard([UserRole.ADMIN, UserRole.MANAGER])
  },
  {
    path: '/users',
    name: 'users',
    component: () => import('@/domains/users/views/UsersPage.vue'),
    meta: { requiresAuth: true },
    beforeEnter: createRoleGuard([UserRole.ADMIN])
  },
  {
    path: '/audit',
    name: 'audit',
    component: () => import('@/domains/audit/views/AuditPage.vue'),
    meta: { requiresAuth: true },
    beforeEnter: createRoleGuard([UserRole.ADMIN, UserRole.MANAGER])
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'not-found',
    component: () => import('@/views/NotFoundPage.vue')
  }
]

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes
})

router.beforeEach(authGuard)

export default router
