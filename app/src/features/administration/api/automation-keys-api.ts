import { apiClient } from '@/lib/api-client'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AutomationKey {
  id: string
  name: string
  keyPrefix: string
  allowedTenants: string[]
  isActive: boolean
  createdBy: string
  lastUsedAt?: string
  createdAt: string
  revokedAt?: string
}

export interface CreateAutomationKeyResponse extends AutomationKey {
  rawKey: string // shown ONCE on creation only
}

export interface AuditLogEntry {
  id: string
  apiKeyId: string
  apiKeyPrefix: string
  method: string
  path: string
  tenantId?: string
  workspaceId?: string
  resourceType?: string
  resourceId?: string
  action?: string
  requestBody?: unknown
  responseStatus: number
  createdAt: string
}

export interface ListKeysResponse {
  data: AutomationKey[]
  count: number
}

export interface ListAuditLogResponse {
  data: AuditLogEntry[]
  count: number
}

export interface CreateKeyRequest {
  name: string
  allowedTenants?: string[]
}

export interface UpdateKeyRequest {
  name?: string
  allowedTenants?: string[]
}

// ─── API Functions ────────────────────────────────────────────────────────────

const BASE = '/admin/automation-keys'

export async function listAutomationKeys(): Promise<ListKeysResponse> {
  const res = await apiClient.get<ListKeysResponse>(BASE)
  return res.data
}

export async function createAutomationKey(
  data: CreateKeyRequest
): Promise<CreateAutomationKeyResponse> {
  const res = await apiClient.post<CreateAutomationKeyResponse>(BASE, data)
  return res.data
}

export async function updateAutomationKey(
  id: string,
  data: UpdateKeyRequest
): Promise<AutomationKey> {
  const res = await apiClient.patch<AutomationKey>(`${BASE}/${id}`, data)
  return res.data
}

export async function revokeAutomationKey(id: string): Promise<void> {
  await apiClient.delete(`${BASE}/${id}`)
}

export async function getAutomationKeyAuditLog(
  id: string,
  limit = 20,
  offset = 0
): Promise<ListAuditLogResponse> {
  const res = await apiClient.get<ListAuditLogResponse>(`${BASE}/${id}/audit`, {
    params: { limit, offset },
  })
  return res.data
}
