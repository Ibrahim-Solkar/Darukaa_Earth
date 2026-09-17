export interface User {
  id: number
  name: string
  email: string
  role: 'admin' | 'user'
}

export interface LoginRequest {
  username: string // FastAPI OAuth2 expects 'username' (which we map to email)
  password: string
}

export interface RegisterRequest {
  name: string
  email: string
  password: string
}

export interface AuthResponse {
  access_token: string
  token_type: string
}
