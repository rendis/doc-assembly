import { apiClient } from '@/lib/api-client'

// Types
export interface Process {
  id: string
  tenantId: string
  code: string
  processType: string
  name: Record<string, string>
  description: Record<string, string>
  isGlobal: boolean
  templatesCount?: number
  createdAt: string
  updatedAt?: string
}

export type ProcessListItem = Process

export interface CreateProcessRequest {
  code: string
  processType: string
  name: Record<string, string>
  description?: Record<string, string>
}

export interface UpdateProcessRequest {
  name: Record<string, string>
  description?: Record<string, string>
}

export interface ProcessTemplateInfo {
  id: string
  title: string
  workspaceId: string
  workspaceName: string
}

export interface DeleteProcessRequest {
  force?: boolean
  replaceWithCode?: string
}

export interface DeleteProcessResponse {
  deleted: boolean
  templates: ProcessTemplateInfo[]
  canReplace: boolean
}

interface PaginationMeta {
  page: number
  perPage: number
  total: number
  totalPages: number
}

export interface ListProcessesResponse {
  data: Process[]
  pagination: PaginationMeta
}

const BASE_PATH = '/tenant/processes'

export async function listProcesses(
  page = 1,
  perPage = 10,
  query?: string
): Promise<ListProcessesResponse> {
  const response = await apiClient.get<ListProcessesResponse>(BASE_PATH, {
    params: { page, perPage, ...(query && { q: query }) },
  })
  return response.data
}

export async function getProcess(id: string): Promise<Process> {
  const response = await apiClient.get<Process>(`${BASE_PATH}/${id}`)
  return response.data
}

export async function getProcessByCode(code: string): Promise<Process> {
  const response = await apiClient.get<Process>(`${BASE_PATH}/code/${code}`)
  return response.data
}

export async function createProcess(
  data: CreateProcessRequest
): Promise<Process> {
  const response = await apiClient.post<Process>(BASE_PATH, data)
  return response.data
}

export async function updateProcess(
  id: string,
  data: UpdateProcessRequest
): Promise<Process> {
  const response = await apiClient.put<Process>(`${BASE_PATH}/${id}`, data)
  return response.data
}

export async function deleteProcess(
  id: string,
  options?: DeleteProcessRequest
): Promise<DeleteProcessResponse> {
  const response = await apiClient.delete<DeleteProcessResponse>(
    `${BASE_PATH}/${id}`,
    { data: options }
  )
  return response.data
}
