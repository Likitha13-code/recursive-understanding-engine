import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  timeout: 60000,
})

// Wake up Render backend on first load (free tier spins down)
export const wakeBackend = () => {
  const base = import.meta.env.VITE_API_URL || ''
  if (base) axios.get(`${base}/`).catch(() => {})
}

export default api