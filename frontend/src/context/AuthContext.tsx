import React, { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import api from '../services/api'
import type { User, LoginRequest, RegisterRequest, AuthResponse } from '../types/auth'

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (data: LoginRequest) => Promise<void>
  register: (data: RegisterRequest) => Promise<void>
  logout: () => void
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('darukaa_token')
      if (token) {
        try {
          const response = await api.get<User>('/auth/me')
          setUser(response.data)
        } catch {
          // Token invalid or expired
          localStorage.removeItem('darukaa_token')
          localStorage.removeItem('darukaa_user')
        }
      }
      setIsLoading(false)
    }
    fetchUser()
  }, [])

  const login = async (data: LoginRequest) => {
    // FastAPI OAuth2PasswordRequestForm requires application/x-www-form-urlencoded
    const formData = new URLSearchParams()
    formData.append('username', data.username)
    formData.append('password', data.password)

    const response = await api.post<AuthResponse>('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })

    localStorage.setItem('darukaa_token', response.data.access_token)

    // Fetch user details immediately after login
    const userResponse = await api.get<User>('/auth/me')
    setUser(userResponse.data)
    localStorage.setItem('darukaa_user', JSON.stringify(userResponse.data))
  }

  const register = async (data: RegisterRequest) => {
    await api.post('/auth/register', data)
    // Auto-login after successful registration
    await login({ username: data.email, password: data.password })
  }

  const logout = () => {
    localStorage.removeItem('darukaa_token')
    localStorage.removeItem('darukaa_user')
    setUser(null)
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, login, register, logout, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used within an AuthProvider')
  return context
}
