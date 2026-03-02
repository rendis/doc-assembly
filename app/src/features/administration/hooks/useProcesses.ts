import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import * as api from '../api/processes-api'
import type { UpdateProcessRequest, DeleteProcessRequest } from '../api/processes-api'

export const processKeys = {
  all: ['processes'] as const,
  list: (page: number, perPage: number, query?: string) =>
    [...processKeys.all, 'list', page, perPage, query] as const,
  detail: (id: string) => [...processKeys.all, 'detail', id] as const,
  byCode: (code: string) => [...processKeys.all, 'byCode', code] as const,
}

export function useProcesses(page: number, perPage: number, query?: string) {
  return useQuery({
    queryKey: processKeys.list(page, perPage, query),
    queryFn: () => api.listProcesses(page, perPage, query),
    placeholderData: keepPreviousData,
    staleTime: 2 * 60 * 1000,
  })
}

export function useProcess(id: string) {
  return useQuery({
    queryKey: processKeys.detail(id),
    queryFn: () => api.getProcess(id),
    enabled: !!id,
  })
}

export function useProcessByCode(code: string) {
  return useQuery({
    queryKey: processKeys.byCode(code),
    queryFn: () => api.getProcessByCode(code),
    enabled: !!code,
  })
}

export function useCreateProcess() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: api.createProcess,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: processKeys.all })
    },
  })
}

export function useUpdateProcess() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProcessRequest }) =>
      api.updateProcess(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: processKeys.all })
    },
  })
}

export function useDeleteProcess() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, options }: { id: string; options?: DeleteProcessRequest }) =>
      api.deleteProcess(id, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: processKeys.all })
    },
  })
}
