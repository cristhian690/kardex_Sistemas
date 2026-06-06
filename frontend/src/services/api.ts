import axios from 'axios'
import type { ApiError, Empresa, EmpresaCreate, EmpresaUpdate } from '../types'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const TOKEN_KEY = 'kardex_token'

export const tokenStorage = {
  get:   () => localStorage.getItem(TOKEN_KEY),
  set:   (token: string) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => localStorage.removeItem(TOKEN_KEY),
}

const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 1000000,
})

// ── Interceptor de request ────────────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// ── Interceptor de respuesta ──────────────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      tokenStorage.clear()
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

// ── Empresa API ───────────────────────────────────────────────────────────────
export const empresaApi = {
  listar: (): Promise<Empresa[]> =>
    api.get('/api/v1/empresa/').then(r => r.data),

  obtener: (id: number): Promise<Empresa> =>
    api.get(`/api/v1/empresa/${id}`).then(r => r.data),

  crear: (data: EmpresaCreate): Promise<Empresa> =>
    api.post('/api/v1/empresa/', data).then(r => r.data),

  actualizar: (id: number, data: EmpresaUpdate): Promise<Empresa> =>
    api.put(`/api/v1/empresa/${id}`, data).then(r => r.data),

  eliminar: (id: number): Promise<void> =>
    api.delete(`/api/v1/empresa/${id}`).then(r => r.data),
}

export default api