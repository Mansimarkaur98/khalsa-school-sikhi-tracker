import { apiClient } from './client'
import type {
  CurrentUserResponse,
  ForgotPasswordRequest,
  LoginRequest,
  MessageResponse,
  ResendVerificationRequest,
  ResetPasswordRequest,
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

export async function forgotPassword(payload: ForgotPasswordRequest): Promise<MessageResponse> {
  const { data } = await apiClient.post<MessageResponse>('/api/v1/auth/forgot-password', payload)
  return data
}

export async function resetPassword(payload: ResetPasswordRequest): Promise<TokenResponse> {
  const { data } = await apiClient.post<TokenResponse>('/api/v1/auth/reset-password', payload)
  return data
}

export async function getCurrentUser(): Promise<CurrentUserResponse> {
  const { data } = await apiClient.get<CurrentUserResponse>('/api/v1/auth/me')
  return data
}
