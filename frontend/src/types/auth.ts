export interface Usuario {
  id: number
  username: string
  nombre_completo: string | null
  rol: string
  activo: boolean
  ultimo_login: string | null
}

export interface LoginPayload {
  username: string
  password: string
}

export interface TokenResponse {
  access_token: string
  token_type: string
}