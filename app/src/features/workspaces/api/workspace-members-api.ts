import apiClient from '@/lib/api-client'
import type { WorkspaceMember } from '@/types/api'

interface ListResponse<T> {
  data: T[]
  count: number
}

export interface InviteWorkspaceMemberRequest {
  email: string
  fullName?: string
  role: string
}

export async function listWorkspaceMembers(): Promise<ListResponse<WorkspaceMember>> {
  const response = await apiClient.get<ListResponse<WorkspaceMember>>('/workspace/members')
  return response.data
}

export async function inviteWorkspaceMember(
  data: InviteWorkspaceMemberRequest
): Promise<WorkspaceMember> {
  const response = await apiClient.post<WorkspaceMember>('/workspace/members', data)
  return response.data
}

export async function updateWorkspaceMemberRole(
  memberId: string,
  data: { role: string }
): Promise<WorkspaceMember> {
  const response = await apiClient.put<WorkspaceMember>(
    `/workspace/members/${memberId}`,
    data
  )
  return response.data
}

export async function removeWorkspaceMember(memberId: string): Promise<void> {
  await apiClient.delete(`/workspace/members/${memberId}`)
}
