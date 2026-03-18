import axios from 'axios'
import { env } from '@/shared/config/env'

export const apiClient = axios.create({
  baseURL: env.apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
})
