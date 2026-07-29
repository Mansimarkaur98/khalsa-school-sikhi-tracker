import { apiClient } from './client'
import type { StudentCreate, StudentListItem, StudentOut, StudentUpdate } from './types'

export interface StudentSearchParams {
  student_id?: string
  first_name?: string
  last_name?: string
  grade?: string
  include_inactive?: boolean
}

export async function searchStudents(params: StudentSearchParams): Promise<StudentListItem[]> {
  const { data } = await apiClient.get<StudentListItem[]>('/api/v1/students', { params })
  return data
}

export async function getStudent(studentId: string): Promise<StudentOut> {
  const { data } = await apiClient.get<StudentOut>(`/api/v1/students/${studentId}`)
  return data
}

export async function createStudent(payload: StudentCreate): Promise<StudentOut> {
  const { data } = await apiClient.post<StudentOut>('/api/v1/students', payload)
  return data
}

export async function updateStudent(studentId: string, payload: StudentUpdate): Promise<StudentOut> {
  const { data } = await apiClient.put<StudentOut>(`/api/v1/students/${studentId}`, payload)
  return data
}

export async function uploadStudentPhoto(studentId: string, file: File): Promise<StudentOut> {
  const formData = new FormData()
  formData.append('file', file)
  const { data } = await apiClient.post<StudentOut>(`/api/v1/students/${studentId}/photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}

export async function removeStudentPhoto(studentId: string): Promise<StudentOut> {
  const { data } = await apiClient.delete<StudentOut>(`/api/v1/students/${studentId}/photo`)
  return data
}

export async function archiveStudent(studentId: string): Promise<void> {
  await apiClient.delete(`/api/v1/students/${studentId}`)
}

export async function restoreStudent(studentId: string): Promise<StudentOut> {
  const { data } = await apiClient.post<StudentOut>(`/api/v1/students/${studentId}/restore`)
  return data
}

export async function permanentlyDeleteStudent(studentId: string): Promise<void> {
  await apiClient.delete(`/api/v1/students/${studentId}/permanent`)
}
