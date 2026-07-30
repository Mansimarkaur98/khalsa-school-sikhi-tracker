import { apiClient } from './client'
import type { AdminUserOut, AdminUserSchoolUpdate } from './types'

export async function listUsers(): Promise<AdminUserOut[]> {
  const { data } = await apiClient.get<AdminUserOut[]>('/api/v1/admin/users')
  return data
}

export async function updateUserSchool(userId: number, payload: AdminUserSchoolUpdate): Promise<AdminUserOut> {
  const { data } = await apiClient.put<AdminUserOut>(`/api/v1/admin/users/${userId}/school`, payload)
  return data
}

export async function deleteUser(userId: number): Promise<void> {
  await apiClient.delete(`/api/v1/admin/users/${userId}`)
}
