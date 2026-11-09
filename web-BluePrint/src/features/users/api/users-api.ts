import { apiClient } from '@/shared/api'
import { Role } from '@/entities/auth/types'

export interface TenantUser {
  id: string
  email: string | null
  firstName: string
  lastName: string
  role: Role
  isActive: boolean
  lastLoginAt: string | null
  createdAt: string
}

export const usersApi = {
  list: async (): Promise<TenantUser[]> => {
    const { data } = await apiClient.get<TenantUser[]>('/users')
    return data
  },
}
