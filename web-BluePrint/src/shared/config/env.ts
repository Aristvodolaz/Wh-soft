// Base URL must include API prefix (e.g. /api/v1) so /auth/login hits the backend route.
export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3030/api/v1',
} as const
