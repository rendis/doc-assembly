import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addSystemUser,
  listSystemUsers,
  revokeSystemUserRole,
  updateSystemUserRole,
} from '../api/system-users-api'
import type { SystemUserRole } from '@/types/api'

export function useSystemUsers() {
  return useQuery({
    queryKey: ['system-users'],
    queryFn: listSystemUsers,
    staleTime: 0,
    gcTime: 0,
  })
}

export function useUpdateSystemUserRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: SystemUserRole }) =>
      updateSystemUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-users'] })
    },
  })
}

export function useAddSystemUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { email: string; fullName?: string; role: SystemUserRole }) =>
      addSystemUser(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-users'] })
    },
  })
}

export function useRevokeSystemUserRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (userId: string) => revokeSystemUserRole(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-users'] })
    },
  })
}
