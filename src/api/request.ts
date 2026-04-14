import axios from 'axios'
import type { AxiosRequestConfig } from 'axios'

const service = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
})

// 请求拦截器
service.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 响应拦截器
service.interceptors.response.use(
  (response) => {
    const res = response.data
    if (res.code && res.code !== 200 && res.code !== 201) {
      return Promise.reject(new Error(res.message || '请求失败'))
    }
    return res.data ?? res
  },
  (error) => Promise.reject(error)
)

// 封装请求函数
export function request<T = any>(config: AxiosRequestConfig): Promise<T> {
  return service(config)
}

export default request