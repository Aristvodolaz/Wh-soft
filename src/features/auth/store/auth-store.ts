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

function decodeJwt(token: string): UserPayload | null {
  try {
    const payload = token.split('.')[1]
    const decoded = JSON.parse(atob(payload))
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
        storage.setAccessToken(accessToken)
        storage.setRefreshToken(refreshToken)
        const user = decodeJwt(accessToken)
        set({ accessToken, refreshToken, user })
      },

      setUser: (user) => set({ user }),

      setWarehouse: (warehouseId) => set({ selectedWarehouseId: warehouseId }),

      logout: () => {
        storage.clearTokens()
        set({ accessToken: null, refreshToken: null, user: null, selectedWarehouseId: null })
      },

      isAuthenticated: () => {
        const { accessToken } = get()
        if (!accessToken) return false
        const user = decodeJwt(accessToken)
        if (!user) return false
        // Check not expired
        return user.exp * 1000 > Date.now()
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
