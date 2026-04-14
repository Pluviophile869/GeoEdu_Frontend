import { request } from './request'

export interface LoginParams {
  username: string
  password: string
}

export interface RegisterParams {
  username: string
  password: string
  role: 'teacher' | 'student'
}

// 根据你的后端实际返回修改这个接口
export interface LoginResponse {
  token: string
  userInfo?: {
    id: number
    username: string
    role: string
  }
}

export function loginApi(data: LoginParams): Promise<LoginResponse> {
  return request({
    url: '/api/v1/auth/login',
    method: 'post',
    data
  })
}

export function registerApi(data: RegisterParams): Promise<any> {
  return request({
    url: '/api/v1/auth/register',
    method: 'post',
    data
  })
}