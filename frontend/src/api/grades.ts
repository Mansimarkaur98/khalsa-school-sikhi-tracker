import { apiClient } from './client'
import type { GradeProgressItem } from './types'

export async function getGradeProgress(grade: string, schoolId?: number): Promise<GradeProgressItem[]> {
  const { data } = await apiClient.get<GradeProgressItem[]>(`/api/v1/grades/${grade}/progress`, {
    params: schoolId !== undefined ? { school_id: schoolId } : undefined,
  })
  return data
}
