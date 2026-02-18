import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listTenantMembers,
  addTenantMember,
  updateTenantMemberRole,
  removeTenantMember,
  type AddTenantMemberRequest,
} from '../api/tenant-members-api'

export function useTenantMembers() {
  return useQuery({
    queryKey: ['tenant-members'],
    queryFn: listTenantMembers,
    staleTime: 0,
    gcTime: 0,
  })
}

export function useAddTenantMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: AddTenantMemberRequest) => addTenantMember(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-members'] })
    },
  })
}

export function useUpdateTenantMemberRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      updateTenantMemberRole(memberId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-members'] })
    },
  })
}

export function useRemoveTenantMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (memberId: string) => removeTenantMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-members'] })
    },
  })
}
