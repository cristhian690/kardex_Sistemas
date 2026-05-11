import axios from 'axios'
import type { ApiError } from '../types'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const TOKEN_KEY = 'kardex_token'

export const tokenStorage = {
  get:   () => localStorage.getItem(TOKEN_KEY),
  set:   (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 1000000,
})

// ── Interceptor de request: adjunta el token automáticamente ──────────────
api.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Interceptor de respuesta ──────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Token expirado o inválido → limpiar y forzar re-login
    if (error.response?.status === 401) {
      tokenStorage.clear()
      // Solo redirigir si no estamos ya en /login (evita bucles)
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    const apiError: ApiError = {
      message:
        error.response?.data?.detail ||
        error.message ||
        'Error de conexión con el servidor',
      status: error.response?.status || 500,
    }

    return Promise.reject(apiError)
  }
)

export default api