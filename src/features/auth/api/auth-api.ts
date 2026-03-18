import { apiClient } from '@/shared/api'
import type { LoginDto, MobilePinLoginDto, RefreshTokenDto, TokenResponse } from '@/entities/auth/types'

export const authApi = {
  login: async (dto: LoginDto): Promise<TokenResponse> => {
    const { data } = await apiClient.post<TokenResponse>('/auth/login', dto)
    return data
  },

  refresh: async (dto: RefreshTokenDto): Promise<TokenResponse> => {
    const { data } = await apiClient.post<TokenResponse>('/auth/refresh', dto)
    return data
  },

  mobilePin: async (dto: MobilePinLoginDto): Promise<TokenResponse> => {
    const { data } = await apiClient.post<TokenResponse>('/auth/mobile-pin', dto)
    return data
  },
}
