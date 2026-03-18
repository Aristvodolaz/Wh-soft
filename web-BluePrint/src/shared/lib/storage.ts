const KEYS = {
  ACCESS_TOKEN: 'wms_access_token',
  REFRESH_TOKEN: 'wms_refresh_token',
} as const

export const storage = {
  getAccessToken: (): string | null => {
    if (typeof window === 'undefined') return null
    const token = localStorage.getItem(KEYS.ACCESS_TOKEN)
    console.log('📦 getAccessToken from localStorage:', {
      hasToken: !!token,
      tokenPreview: token?.substring(0, 30) + '...',
    })
    return token
  },
  setAccessToken: (token: string) => {
    console.log('💾 setAccessToken to localStorage:', {
      tokenLength: token?.length,
      tokenPreview: token?.substring(0, 30) + '...',
    })
    localStorage.setItem(KEYS.ACCESS_TOKEN, token)
    // Verify it was saved
    const saved = localStorage.getItem(KEYS.ACCESS_TOKEN)
    console.log('✓ Verified localStorage save:', { success: saved === token })
  },
  getRefreshToken: (): string | null => {
    if (typeof window === 'undefined') return null
    const token = localStorage.getItem(KEYS.REFRESH_TOKEN)
    console.log('📦 getRefreshToken from localStorage:', { hasToken: !!token })
    return token
  },
  setRefreshToken: (token: string) => {
    console.log('💾 setRefreshToken to localStorage:', { tokenLength: token?.length })
    localStorage.setItem(KEYS.REFRESH_TOKEN, token)
  },
  clearTokens: () => {
    console.log('🗑️ Clearing tokens from localStorage')
    localStorage.removeItem(KEYS.ACCESS_TOKEN)
    localStorage.removeItem(KEYS.REFRESH_TOKEN)
  },
}
