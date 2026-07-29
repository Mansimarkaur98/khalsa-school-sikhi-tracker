import { apiClient } from './client'
import type { CategoryOut, LevelOut } from './types'

export async function listCategories(): Promise<CategoryOut[]> {
  const { data } = await apiClient.get<CategoryOut[]>('/api/v1/categories')
  return data
}

export async function listLevels(categoryId: number): Promise<LevelOut[]> {
  const { data } = await apiClient.get<LevelOut[]>(`/api/v1/categories/${categoryId}/levels`)
  return data
}
