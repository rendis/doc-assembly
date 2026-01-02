import apiClient from '@/lib/api-client'

export interface TagWithCount {
  id: string
  name: string
  color: string
  templateCount: number
  workspaceId: string
  createdAt: string
  updatedAt: string
}

interface TagsListResponse {
  data: TagWithCount[]
  count: number
}

export async function fetchTags(): Promise<TagsListResponse> {
  const response = await apiClient.get<TagsListResponse>('/workspace/tags')
  return response.data
}
