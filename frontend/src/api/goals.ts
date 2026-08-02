import { apiClient } from './client'
import type { GoalCreate, GoalOut } from './types'

export async function listGoals(studentId: string): Promise<GoalOut[]> {
  const { data } = await apiClient.get<GoalOut[]>(`/api/v1/students/${studentId}/goals`)
  return data
}

export async function createGoal(studentId: string, payload: GoalCreate): Promise<GoalOut> {
  const { data } = await apiClient.post<GoalOut>(`/api/v1/students/${studentId}/goals`, payload)
  return data
}
