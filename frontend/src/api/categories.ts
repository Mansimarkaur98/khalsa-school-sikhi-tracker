import { apiClient } from './client'
import type {
  CategoryCreate,
  CategoryLevelCreate,
  CategoryLevelUpdate,
  CategoryOut,
  CategoryUpdate,
  LevelOut,
} from './types'

export async function listCategories(includeInactive = false): Promise<CategoryOut[]> {
  const { data } = await apiClient.get<CategoryOut[]>('/api/v1/categories', {
    params: includeInactive ? { include_inactive: true } : undefined,
  })
  return data
}

export async function createCategory(payload: CategoryCreate): Promise<CategoryOut> {
  const { data } = await apiClient.post<CategoryOut>('/api/v1/categories', payload)
  return data
}

export async function updateCategory(categoryId: number, payload: CategoryUpdate): Promise<CategoryOut> {
  const { data } = await apiClient.put<CategoryOut>(`/api/v1/categories/${categoryId}`, payload)
  return data
}

export async function deactivateCategory(categoryId: number): Promise<void> {
  await apiClient.delete(`/api/v1/categories/${categoryId}`)
}

export async function restoreCategory(categoryId: number): Promise<CategoryOut> {
  const { data } = await apiClient.post<CategoryOut>(`/api/v1/categories/${categoryId}/restore`)
  return data
}

export async function listLevels(categoryId: number, includeInactive = false): Promise<LevelOut[]> {
  const { data } = await apiClient.get<LevelOut[]>(`/api/v1/categories/${categoryId}/levels`, {
    params: includeInactive ? { include_inactive: true } : undefined,
  })
  return data
}

export async function createLevel(categoryId: number, payload: CategoryLevelCreate): Promise<LevelOut> {
  const { data } = await apiClient.post<LevelOut>(`/api/v1/categories/${categoryId}/levels`, payload)
  return data
}

export async function updateLevel(categoryId: number, levelId: number, payload: CategoryLevelUpdate): Promise<LevelOut> {
  const { data } = await apiClient.put<LevelOut>(`/api/v1/categories/${categoryId}/levels/${levelId}`, payload)
  return data
}

export async function deactivateLevel(categoryId: number, levelId: number): Promise<void> {
  await apiClient.delete(`/api/v1/categories/${categoryId}/levels/${levelId}`)
}

export async function restoreLevel(categoryId: number, levelId: number): Promise<LevelOut> {
  const { data } = await apiClient.post<LevelOut>(`/api/v1/categories/${categoryId}/levels/${levelId}/restore`)
  return data
}
