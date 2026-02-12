import { tokenService } from '@/lib/token'
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

/* =======================
   Axios instance
======================= */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  timeout: 10000
})

/* =======================
   Request interceptor
======================= */
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenService.getAccessToken()

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error)
)

/* =======================
   Refresh token logic
======================= */
let isRefreshing = false

type FailedRequest = {
  resolve: (token: string) => void
  reject: (error: unknown) => void
}

let failedQueue: FailedRequest[] = []

const processQueue = (error: unknown, token?: string) => {
  failedQueue.forEach((p) => {
    if (error) p.reject(error)
    else p.resolve(token!)
  })
  failedQueue = []
}

const refreshAccessToken = async (): Promise<string> => {
  const refreshToken = tokenService.getRefreshToken()
  if (!refreshToken) throw new Error('No refresh token')

  const res = await axios.post(`${import.meta.env.VITE_API_URL}/auth/refresh`, { refreshToken })

  const { accessToken, refreshToken: newRefreshToken } = res.data

  tokenService.setTokens(accessToken, newRefreshToken)

  return accessToken
}

/* =======================
   Response interceptor
======================= */
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({
            resolve: (token: string) => {
              originalRequest.headers.Authorization = `Bearer ${token}`
              resolve(api(originalRequest))
            },
            reject
          })
        })
      }

      originalRequest._retry = true
      isRefreshing = true

      try {
        const newToken = await refreshAccessToken()
        processQueue(null, newToken)

        originalRequest.headers.Authorization = `Bearer ${newToken}`
        return api(originalRequest)
      } catch (err) {
        processQueue(err)
        tokenService.clear()
        window.location.href = '/login'
        return Promise.reject(err)
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(error)
  }
)

export default api
