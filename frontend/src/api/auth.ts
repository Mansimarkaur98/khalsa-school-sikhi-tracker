import { apiClient } from './client'
import type {
  LoginRequest,
  ResendVerificationRequest,
  SignupRequest,
  SignupResponse,
  TokenResponse,
} from './types'

export async function login(payload: LoginRequest): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>('/api/v1/auth/login', payload)
  return data
}

export async function signup(payload: SignupRequest): Promise<SignupResponse> {
  const { data } = await apiClient.post<SignupResponse>('/api/v1/auth/signup', payload)
  return data
}

export async function verifyEmail(token: string): Promise<TokenResponse> {
  const { data } = await apiClient.get<TokenResponse>('/api/v1/auth/verify-email', { params: { token } })
  return data
}

export async function resendVerification(payload: ResendVerificationRequest): Promise<SignupResponse> {
  const { data } = await apiClient.post<SignupResponse>('/api/v1/auth/resend-verification', payload)
  return data
}
