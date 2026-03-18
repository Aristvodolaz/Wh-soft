import { apiClient } from './client'
import { storage } from '@/shared/lib/storage'
import type { TokenResponse } from '@/entities/auth/types'

let isRefreshing = false
let refreshSubscribers: Array<(token: string) => void> = []

function subscribeTokenRefresh(cb: (token: string) => void) {
  refreshSubscribers.push(cb)
}

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token))
  refreshSubscribers = []
}

// Request interceptor — attach access token
apiClient.interceptors.request.use((config) => {
  const token = storage.getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Unwrap Nest TransformInterceptor shape { success, data, timestamp } so callers see inner payload
apiClient.interceptors.response.use((response) => {
  const body = response.data
  console.log('🌐 API Response:', {
    url: response.config.url,
    status: response.status,
    hasSuccessField: body && 'success' in body,
    hasDataField: body && 'data' in body,
    bodyKeys: body && typeof body === 'object' ? Object.keys(body) : [],
  })
  if (
    body &&
    typeof body === 'object' &&
    'success' in body &&
    'data' in body &&
    typeof (body as { success: unknown }).success === 'boolean'
  ) {
    console.log('📦 Unwrapping Nest envelope, inner data:', (body as { data: unknown }).data)
    response.data = (body as { data: unknown }).data
  }
  return response
})

// Response interceptor — handle 401, refresh, retry
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        // Queue up requests while refresh is in progress
        return new Promise((resolve) => {
          subscribeTokenRefresh((token: string) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            resolve(apiClient(originalRequest))
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const refreshToken = storage.getRefreshToken()
        if (!refreshToken) {
          throw new Error('No refresh token')
        }

        const { data } = await apiClient.post<TokenResponse>('/auth/refresh', {
          refreshToken,
        })

        storage.setAccessToken(data.accessToken)
        storage.setRefreshToken(data.refreshToken)

        onTokenRefreshed(data.accessToken)
        originalRequest.headers.Authorization = `Bearer ${data.accessToken}`

        return apiClient(originalRequest)
      } catch {
        storage.clearTokens()
        // Redirect to login on client side
        if (typeof window !== 'undefined') {
          window.location.href = '/login'
        }
        return Promise.reject(error)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export { apiClient }
