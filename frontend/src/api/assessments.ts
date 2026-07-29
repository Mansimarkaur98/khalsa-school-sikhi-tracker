import { apiClient } from './client'
import type { AssessmentCreate, AssessmentOut } from './types'

export async function listAssessments(studentId: string): Promise<AssessmentOut[]> {
  const { data } = await apiClient.get<AssessmentOut[]>(`/api/v1/students/${studentId}/assessments`)
  return data
}

export async function createAssessment(studentId: string, payload: AssessmentCreate): Promise<AssessmentOut> {
  const { data } = await apiClient.post<AssessmentOut>(`/api/v1/students/${studentId}/assessments`, payload)
  return data
}

export async function updateAssessment(
  studentId: string,
  assessmentId: number,
  payload: AssessmentCreate,
): Promise<AssessmentOut> {
  const { data } = await apiClient.put<AssessmentOut>(
    `/api/v1/students/${studentId}/assessments/${assessmentId}`,
    payload,
  )
  return data
}

export async function deleteAssessment(studentId: string, assessmentId: number): Promise<void> {
  await apiClient.delete(`/api/v1/students/${studentId}/assessments/${assessmentId}`)
}
