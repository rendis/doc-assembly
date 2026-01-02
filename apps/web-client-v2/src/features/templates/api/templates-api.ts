import apiClient from '@/lib/api-client'
import type { TemplateListItem } from '@/types/api'

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
