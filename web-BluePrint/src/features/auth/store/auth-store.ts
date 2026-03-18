import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserPayload, Role } from '@/entities/auth/types'
import { storage } from '@/shared/lib/storage'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: UserPayload | null
  selectedWarehouseId: string | null
  _hasHydrated: boolean
}

interface AuthActions {
  setTokens: (accessToken: string, refreshToken: string) => void
  setUser: (user: UserPayload) => void
  setWarehouse: (warehouseId: string) => void
  logout: () => void
  isAuthenticated: () => boolean
  hasRole: (role: Role) => boolean
  setHasHydrated: (state: boolean) => void
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
      _hasHydrated: false,

      // Actions
      setTokens: (accessToken, refreshToken) => {
        console.log('setTokens called')
        const user = decodeJwt(accessToken)
        console.log('Decoded user:', user)
        // Update both Zustand store and localStorage
        storage.setAccessToken(accessToken)
        storage.setRefreshToken(refreshToken)
        set({ accessToken, refreshToken, user })
        console.log('Tokens saved to store and localStorage')
      },

      setUser: (user) => set({ user }),

      setWarehouse: (warehouseId) => set({ selectedWarehouseId: warehouseId }),

      logout: () => {
        storage.clearTokens()
        set({ accessToken: null, refreshToken: null, user: null, selectedWarehouseId: null })
      },

      isAuthenticated: () => {
        const { accessToken } = get()
        console.log('isAuthenticated check - accessToken from store:', !!accessToken)
        
        if (!accessToken) {
          // Fallback to localStorage if Zustand hasn't hydrated yet
          const storedToken = storage.getAccessToken()
          console.log('No token in store, checking localStorage:', !!storedToken)
          if (!storedToken) return false
          const user = decodeJwt(storedToken)
          if (!user) return false
          const isValid = user.exp * 1000 > Date.now()
          console.log('Token from localStorage valid:', isValid)
          return isValid
        }
        const user = decodeJwt(accessToken)
        if (!user) return false
        const isValid = user.exp * 1000 > Date.now()
        console.log('Token from store valid:', isValid)
        return isValid
      },

      hasRole: (role) => {
        const { user } = get()
        return user?.role === role
      },

      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'wms-auth',
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        selectedWarehouseId: state.selectedWarehouseId,
      }),
      onRehydrateStorage: () => (state) => {
        console.log('Zustand rehydration complete')
        state?.setHasHydrated(true)
      },
    }
  )
)
