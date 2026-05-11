import api from './api'
import type { Usuario, LoginPayload, TokenResponse } from '../types'

export const authService = {
  async login(payload: LoginPayload): Promise<TokenResponse> {
    const { data } = await api.post<TokenResponse>('/api/v1/auth/login', payload)
    return data
  },

  async getMe(): Promise<Usuario> {
    const { data } = await api.get<Usuario>('/api/v1/auth/me')
    return data
  },
}