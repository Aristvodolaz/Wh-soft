const KEYS = {
  ACCESS_TOKEN: 'wms_access_token',
  REFRESH_TOKEN: 'wms_refresh_token',
} as const

export const storage = {
  getAccessToken: (): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(KEYS.ACCESS_TOKEN)
  },
  setAccessToken: (token: string) => {
    localStorage.setItem(KEYS.ACCESS_TOKEN, token)
  },
  getRefreshToken: (): string | null => {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(KEYS.REFRESH_TOKEN)
  },
  setRefreshToken: (token: string) => {
    localStorage.setItem(KEYS.REFRESH_TOKEN, token)
  },
  clearTokens: () => {
    localStorage.removeItem(KEYS.ACCESS_TOKEN)
    localStorage.removeItem(KEYS.REFRESH_TOKEN)
  },
}
