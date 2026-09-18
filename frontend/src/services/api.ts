import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api'

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor: Attach JWT to all requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('darukaa_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: Handle 401 Unauthorized globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('darukaa_token')
      localStorage.removeItem('darukaa_user')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

export default api
