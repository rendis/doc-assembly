import apiClient from '@/lib/api-client'
import type { SystemUser, SystemUserRole } from '@/types/api'

interface ListResponse<T> {
  data: T[]
  count: number
}

export async function listSystemUsers(): Promise<ListResponse<SystemUser>> {
  const response = await apiClient.get<ListResponse<SystemUser>>('/system/users')
  return response.data
}

export async function addSystemUser(input: {
  email: string
  fullName?: string
  role: SystemUserRole
}): Promise<void> {
  await apiClient.post('/system/users', input)
}

export async function updateSystemUserRole(
  userId: string,
  role: SystemUserRole
): Promise<void> {
  await apiClient.post(`/system/users/${userId}/role`, { role })
}

export async function revokeSystemUserRole(userId: string): Promise<void> {
  await apiClient.delete(`/system/users/${userId}/role`)
}
