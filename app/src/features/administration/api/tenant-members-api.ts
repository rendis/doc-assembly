import apiClient from '@/lib/api-client'
import type { TenantMember } from '@/types/api'

interface ListResponse<T> {
  data: T[]
  count: number
}

export interface AddTenantMemberRequest {
  email: string
  fullName?: string
  role: string
}

export async function listTenantMembers(): Promise<ListResponse<TenantMember>> {
  const response = await apiClient.get<ListResponse<TenantMember>>('/tenant/members')
  return response.data
}

export async function addTenantMember(data: AddTenantMemberRequest): Promise<TenantMember> {
  const response = await apiClient.post<TenantMember>('/tenant/members', data)
  return response.data
}

export async function updateTenantMemberRole(
  memberId: string,
  data: { role: string }
): Promise<TenantMember> {
  const response = await apiClient.put<TenantMember>(`/tenant/members/${memberId}`, data)
  return response.data
}

export async function removeTenantMember(memberId: string): Promise<void> {
  await apiClient.delete(`/tenant/members/${memberId}`)
}
