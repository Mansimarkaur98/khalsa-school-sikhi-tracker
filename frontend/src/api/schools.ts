import { apiClient } from './client'
import type { SchoolOut } from './types'

export async function listSchools(): Promise<SchoolOut[]> {
  const { data } = await apiClient.get<SchoolOut[]>('/api/v1/schools')
  return data
}
