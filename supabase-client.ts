import { createClient } from '@supabase/supabase-js'
import type { Database } from './database.types'
import { SUPABASE_FETCH_TIMEOUT_MS } from './request-timeouts'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

/**
 * Обёртка над fetch с таймаутом. Предотвращает бесконечное зависание
 * при недоступности Supabase и сохраняет внешние AbortSignal от query/RPC.
 */
function fetchWithTimeout(url: RequestInfo | URL, options?: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), SUPABASE_FETCH_TIMEOUT_MS)

  const externalSignal = options?.signal
  const abortFromExternalSignal = () => controller.abort()

  if (externalSignal?.aborted) {
    controller.abort()
  } else {
    externalSignal?.addEventListener('abort', abortFromExternalSignal, { once: true })
  }

  return fetch(url, { ...options, signal: controller.signal }).finally(() => {
    clearTimeout(timeoutId)
    externalSignal?.removeEventListener('abort', abortFromExternalSignal)
  })
}

/**
 * Supabase client singleton
 * Используется через API layer, не напрямую из компонентов
 */
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  global: { fetch: fetchWithTimeout }
})
