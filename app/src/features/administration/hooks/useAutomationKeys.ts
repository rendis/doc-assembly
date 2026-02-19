import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import {
  listAutomationKeys,
  createAutomationKey,
  updateAutomationKey,
  revokeAutomationKey,
  getAutomationKeyAuditLog,
  type CreateKeyRequest,
  type UpdateKeyRequest,
} from '../api/automation-keys-api'

export const automationKeysKeys = {
  all: ['automation-keys'] as const,
  list: () => [...automationKeysKeys.all, 'list'] as const,
  audit: (id: string, limit: number, offset: number) =>
    [...automationKeysKeys.all, 'audit', id, limit, offset] as const,
}

export function useAutomationKeys() {
  return useQuery({
    queryKey: automationKeysKeys.list(),
    queryFn: listAutomationKeys,
    staleTime: 60 * 1000,
  })
}

export function useCreateAutomationKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: CreateKeyRequest) => createAutomationKey(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationKeysKeys.all })
    },
  })
}

export function useUpdateAutomationKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateKeyRequest }) =>
      updateAutomationKey(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationKeysKeys.all })
    },
  })
}

export function useRevokeAutomationKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => revokeAutomationKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: automationKeysKeys.all })
    },
  })
}

export function useAutomationKeyAuditLog(
  id: string,
  limit: number,
  offset: number,
  enabled: boolean
) {
  return useQuery({
    queryKey: automationKeysKeys.audit(id, limit, offset),
    queryFn: () => getAutomationKeyAuditLog(id, limit, offset),
    placeholderData: keepPreviousData,
    enabled,
    staleTime: 30 * 1000,
  })
}
