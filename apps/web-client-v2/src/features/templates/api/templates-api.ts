import apiClient from '@/lib/api-client'
import type {
  TemplateListItem,
  CreateTemplateRequest,
  TemplateCreateResponse,
  TemplateWithAllVersionsResponse,
  TemplateVersionResponse,
  CreateVersionRequest,
  UpdateVersionRequest,
} from '@/types/api'

export interface TemplatesListParams {
  search?: string
  hasPublishedVersion?: boolean
  tagIds?: string[]
  limit?: number
  offset?: number
}

export interface TemplatesListResponse {
  items: TemplateListItem[]
  total: number
  limit: number
  offset: number
}

export async function fetchTemplates(
  params: TemplatesListParams = {}
): Promise<TemplatesListResponse> {
  const searchParams = new URLSearchParams()

  if (params.search) searchParams.set('search', params.search)
  if (params.hasPublishedVersion !== undefined) {
    searchParams.set('hasPublishedVersion', String(params.hasPublishedVersion))
  }
  if (params.tagIds?.length) {
    searchParams.set('tagIds', params.tagIds.join(','))
  }
  if (params.limit) searchParams.set('limit', String(params.limit))
  if (params.offset) searchParams.set('offset', String(params.offset))

  const query = searchParams.toString()
  const response = await apiClient.get<TemplatesListResponse>(
    `/content/templates${query ? `?${query}` : ''}`
  )
  return response.data
}

export async function createTemplate(
  data: CreateTemplateRequest
): Promise<TemplateCreateResponse> {
  const response = await apiClient.post<TemplateCreateResponse>(
    '/content/templates',
    data
  )
  return response.data
}

export interface AddTagsToTemplateRequest {
  tagIds: string[]
}

export async function addTagsToTemplate(
  templateId: string,
  tagIds: string[]
): Promise<void> {
  if (tagIds.length === 0) return
  await apiClient.post<void>(`/content/templates/${templateId}/tags`, {
    tagIds,
  })
}

export async function updateTemplate(
  templateId: string,
  data: { title?: string; folderId?: string; isPublicLibrary?: boolean }
): Promise<void> {
  await apiClient.put<void>(`/content/templates/${templateId}`, data)
}

export async function deleteTemplate(templateId: string): Promise<void> {
  await apiClient.delete<void>(`/content/templates/${templateId}`)
}

export async function removeTagFromTemplate(
  templateId: string,
  tagId: string
): Promise<void> {
  await apiClient.delete<void>(`/content/templates/${templateId}/tags/${tagId}`)
}

// ============================================
// Template Detail & Versions API
// ============================================

export async function fetchTemplateWithVersions(
  templateId: string
): Promise<TemplateWithAllVersionsResponse> {
  const response = await apiClient.get<TemplateWithAllVersionsResponse>(
    `/content/templates/${templateId}/all-versions`
  )
  return response.data
}

export async function createVersion(
  templateId: string,
  data: CreateVersionRequest
): Promise<TemplateVersionResponse> {
  const response = await apiClient.post<TemplateVersionResponse>(
    `/content/templates/${templateId}/versions`,
    data
  )
  return response.data
}

export async function updateVersion(
  templateId: string,
  versionId: string,
  data: UpdateVersionRequest
): Promise<TemplateVersionResponse> {
  const response = await apiClient.put<TemplateVersionResponse>(
    `/content/templates/${templateId}/versions/${versionId}`,
    data
  )
  return response.data
}
