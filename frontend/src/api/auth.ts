import { apiClient } from './client'
import type { LoginRequest, TokenResponse } from './types'

export async function login(payload: LoginRequest): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>('/api/v1/auth/login', payload)
  return data
}
