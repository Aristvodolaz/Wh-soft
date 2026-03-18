import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserPayload, Role } from '@/entities/auth/types'
import { storage } from '@/shared/lib/storage'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: UserPayload | null
  selectedWarehouseId: string | null
}

interface AuthActions {
  setTokens: (accessToken: string, refreshToken: string) => void
  setUser: (user: UserPayload) => void
  setWarehouse: (warehouseId: string) => void
  logout: () => void
  isAuthenticated: () => boolean
  hasRole: (role: Role) => boolean
}

type AuthStore = AuthState & AuthActions

// Decode JWT payload; supports base64url (standard for JWT) so atob does not fail on - _
function decodeJwt(token: string): UserPayload | null {
  try {
    const payload = token.split('.')[1]
    if (!payload) return null
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/')
    const pad = base64.length % 4
    const padded = pad ? base64 + '='.repeat(4 - pad) : base64
    const decoded = JSON.parse(atob(padded))
    return decoded as UserPayload
  } catch {
    return null
  }
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // State
      accessToken: null,
      refreshToken: null,
      user: null,
      selectedWarehouseId: null,

      // Actions
      setTokens: (accessToken, refreshToken) => {
        console.log('🔐 setTokens called:', {
          accessTokenLength: accessToken?.length,
          refreshTokenLength: refreshToken?.length,
          accessTokenPreview: accessToken?.substring(0, 30) + '...',
        })
        storage.setAccessToken(accessToken)
        storage.setRefreshToken(refreshToken)
        const user = decodeJwt(accessToken)
        console.log('🔐 JWT decoded:', {
          user,
          isValid: !!user,
          exp: user?.exp,
          expiresAt: user?.exp ? new Date(user.exp * 1000).toISOString() : 'N/A',
        })
        set({ accessToken, refreshToken, user })
        console.log('🔐 Tokens saved to Zustand store')
      },

      setUser: (user) => set({ user }),

      setWarehouse: (warehouseId) => set({ selectedWarehouseId: warehouseId }),

      logout: () => {
        storage.clearTokens()
        set({ accessToken: null, refreshToken: null, user: null, selectedWarehouseId: null })
      },

      isAuthenticated: () => {
        const { accessToken } = get()
        console.log('🔍 isAuthenticated check:', {
          hasAccessToken: !!accessToken,
          accessTokenPreview: accessToken?.substring(0, 30) + '...',
        })
        if (!accessToken) {
          console.log('❌ No access token in store')
          return false
        }
        const user = decodeJwt(accessToken)
        if (!user) {
          console.log('❌ Failed to decode JWT')
          return false
        }
        const isExpired = user.exp * 1000 <= Date.now()
        console.log('🔍 Token validation:', {
          exp: user.exp,
          expiresAt: new Date(user.exp * 1000).toISOString(),
          now: new Date().toISOString(),
          isExpired,
        })
        // Check not expired
        return !isExpired
      },

      hasRole: (role) => {
        const { user } = get()
        return user?.role === role
      },
    }),
    {
      name: 'wms-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        selectedWarehouseId: state.selectedWarehouseId,
      }),
    }
  )
)
