import { apiClient } from '@/shared/api'
import type { LoginDto, MobilePinLoginDto, RefreshTokenDto, TokenResponse } from '@/entities/auth/types'

export const authApi = {
  login: async (dto: LoginDto): Promise<TokenResponse> => {
    console.log('Calling login API with:', dto)
    const response = await apiClient.post<{ success: boolean; data: TokenResponse; timestamp: string }>('/auth/login', dto)
    console.log('Full axios response:', response)
    console.log('Response data:', response.data)
    console.log('Extracted tokens:', response.data.data)
    return response.data.data
  },

  refresh: async (dto: RefreshTokenDto): Promise<TokenResponse> => {
    const response = await apiClient.post<{ success: boolean; data: TokenResponse; timestamp: string }>('/auth/refresh', dto)
    return response.data.data
  },

  mobilePin: async (dto: MobilePinLoginDto): Promise<TokenResponse> => {
    const response = await apiClient.post<{ success: boolean; data: TokenResponse; timestamp: string }>('/auth/mobile-pin', dto)
    return response.data.data
  },
}
