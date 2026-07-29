import { apiClient } from './client'
import type { GradeProgressItem } from './types'

export async function getGradeProgress(grade: string): Promise<GradeProgressItem[]> {
  const { data } = await apiClient.get<GradeProgressItem[]>(`/api/v1/grades/${grade}/progress`)
  return data
}
