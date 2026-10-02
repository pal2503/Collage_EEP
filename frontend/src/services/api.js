import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use((response) => response, async (error) => {
  const original = error.config
  if (error.response?.status === 401 && !original?._retried && !original?.url?.includes('/auth/token')) {
    const refresh = localStorage.getItem('refreshToken')
    if (refresh) {
      original._retried = true
      try {
        const { data } = await axios.post(`${api.defaults.baseURL}/auth/token/refresh/`, { refresh })
        localStorage.setItem('accessToken', data.access)
        if (data.refresh) localStorage.setItem('refreshToken', data.refresh)
        original.headers.Authorization = `Bearer ${data.access}`
        return api(original)
      } catch {
        localStorage.removeItem('accessToken')
        localStorage.removeItem('refreshToken')
        window.dispatchEvent(new Event('erp:session-expired'))
      }
    }
  }
  return Promise.reject(error)
})

export default api
