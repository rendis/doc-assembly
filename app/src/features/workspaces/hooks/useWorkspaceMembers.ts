import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listWorkspaceMembers,
  inviteWorkspaceMember,
  updateWorkspaceMemberRole,
  removeWorkspaceMember,
  type InviteWorkspaceMemberRequest,
} from '../api/workspace-members-api'

export function useWorkspaceMembers() {
  return useQuery({
    queryKey: ['workspace-members'],
    queryFn: listWorkspaceMembers,
    staleTime: 0,
    gcTime: 0,
  })
}

export function useInviteWorkspaceMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: InviteWorkspaceMemberRequest) => inviteWorkspaceMember(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members'] })
    },
  })
}

export function useUpdateWorkspaceMemberRole() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      updateWorkspaceMemberRole(memberId, { role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members'] })
    },
  })
}

export function useRemoveWorkspaceMember() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (memberId: string) => removeWorkspaceMember(memberId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace-members'] })
    },
  })
}
