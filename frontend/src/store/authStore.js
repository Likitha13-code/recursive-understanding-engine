import { create } from 'zustand'
import api from '../api'

const loadAuth = () => {
  try {
    const t = localStorage.getItem('rue_token')
    const u = localStorage.getItem('rue_user')
    if (t && u) return { token: t, user: JSON.parse(u) }
  } catch {}
  return { token: null, user: null }
}

const saved = loadAuth()

const useAuthStore = create((set, get) => ({
  token: saved.token,
  user:  saved.user,   // { user_id, email }
  isLoading: false,
  error: null,

  register: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const { data } = await api.post('/api/auth/register', { email, password })
      localStorage.setItem('rue_token', data.token)
      localStorage.setItem('rue_user', JSON.stringify({ user_id: data.user_id, email: data.email }))
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
      set({ token: data.token, user: { user_id: data.user_id, email: data.email }, isLoading: false })
      return true
    } catch (e) {
      set({ error: e.response?.data?.detail || 'Registration failed', isLoading: false })
      return false
    }
  },

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const { data } = await api.post('/api/auth/login', { email, password })
      localStorage.setItem('rue_token', data.token)
      localStorage.setItem('rue_user', JSON.stringify({ user_id: data.user_id, email: data.email }))
      api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`
      set({ token: data.token, user: { user_id: data.user_id, email: data.email }, isLoading: false })
      return true
    } catch (e) {
      set({ error: e.response?.data?.detail || 'Login failed', isLoading: false })
      return false
    }
  },

  logout: () => {
    localStorage.removeItem('rue_token')
    localStorage.removeItem('rue_user')
    delete api.defaults.headers.common['Authorization']
    set({ token: null, user: null, error: null })
  },

  clearError: () => set({ error: null }),

  // Restore token in axios headers on app init
  initAuth: () => {
    const { token } = get()
    if (token) api.defaults.headers.common['Authorization'] = `Bearer ${token}`
  },
}))

export default useAuthStore
