import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/use-toast'
import { usePermission } from '@/features/auth'
import { Permission } from '@/features/auth/rbac/rules'
import {
  useWorkspaceMembers,
  useUpdateWorkspaceMemberRole,
} from '@/features/workspaces/hooks/useWorkspaceMembers'
import {
  AlertTriangle,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import type { WorkspaceMember } from '@/types/api'
import { InviteWorkspaceMemberDialog } from './InviteWorkspaceMemberDialog'
import { RemoveWorkspaceMemberDialog } from './RemoveWorkspaceMemberDialog'

const TH_CLASS =
  'p-4 text-left font-mono text-xs uppercase tracking-widest text-muted-foreground'

const WORKSPACE_ROLES = ['OWNER', 'ADMIN', 'EDITOR', 'OPERATOR', 'VIEWER'] as const

function RoleBadge({ role }: { role: string }) {
  const isOwner = role === 'OWNER'
  return (
    <span
      className={cn(
        'inline-flex min-w-[80px] items-center justify-center gap-1.5 rounded-sm border px-2 py-0.5 font-mono text-xs uppercase',
        isOwner
          ? 'border-primary/30 bg-primary/10 text-primary'
          : 'border-border bg-muted text-muted-foreground'
      )}
    >
      {role}
    </span>
  )
}

function StatusIndicator({ status }: { status: string }) {
  const isActive = status === 'ACTIVE'
  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs">
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          isActive ? 'bg-green-500' : 'bg-yellow-500'
        )}
      />
      <span
        className={
          isActive
            ? 'text-green-600 dark:text-green-400'
            : 'text-yellow-600 dark:text-yellow-400'
        }
      >
        {status}
      </span>
    </span>
  )
}

function formatMembershipStatus(
  membershipStatus: string,
  userStatus?: string
): string {
  if (membershipStatus === 'PENDING') return 'PENDING'
  if (userStatus === 'SUSPENDED') return 'SUSPENDED'
  return 'ACTIVE'
}

export function WorkspaceMembersSection(): React.ReactElement {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { hasPermission } = usePermission()

  const canInvite = hasPermission(Permission.MEMBERS_INVITE)
  const canRemove = hasPermission(Permission.MEMBERS_REMOVE)
  const canUpdateRole = hasPermission(Permission.MEMBERS_UPDATE_ROLE)
  const hasAnyAction = canRemove || canUpdateRole

  const [searchQuery, setSearchQuery] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [removeOpen, setRemoveOpen] = useState(false)
  const [selectedMember, setSelectedMember] = useState<WorkspaceMember | null>(
    null
  )

  const { data, isLoading, error } = useWorkspaceMembers()
  const updateRoleMutation = useUpdateWorkspaceMemberRole()

  const filteredMembers = useMemo(() => {
    const members = data?.data ?? []
    if (!searchQuery.trim()) return members
    const q = searchQuery.toLowerCase()
    return members.filter(
      (m) =>
        m.user?.fullName?.toLowerCase().includes(q) ||
        m.user?.email?.toLowerCase().includes(q)
    )
  }, [data?.data, searchQuery])

  const handleChangeRole = async (member: WorkspaceMember, newRole: string) => {
    try {
      await updateRoleMutation.mutateAsync({
        memberId: member.id,
        role: newRole,
      })
      toast({
        title: t('settings.members.roleUpdated', 'Role updated'),
      })
    } catch {
      toast({
        variant: 'destructive',
        title: t('common.error', 'Error'),
        description: t(
          'settings.members.roleError',
          'Failed to update role'
        ),
      })
    }
  }

  const handleRemove = (member: WorkspaceMember) => {
    setSelectedMember(member)
    setRemoveOpen(true)
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-8 border-b border-border py-12 lg:grid-cols-12">
        {/* Left description column */}
        <div className="pr-8 lg:col-span-4">
          <div className="mb-2 flex items-center gap-2">
            <Users size={20} className="text-muted-foreground" />
            <h3 className="font-display text-xl font-medium text-foreground">
              {t('settings.members.title', 'Members')}
            </h3>
          </div>
          <p className="font-mono text-xs uppercase leading-relaxed tracking-widest text-muted-foreground">
            {t(
              'settings.members.description',
              'Manage members and their roles for this workspace.'
            )}
          </p>
        </div>

        {/* Right content column */}
        <div className="space-y-6 lg:col-span-8">
          {/* Search and Invite button */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="group relative w-full md:max-w-xs">
              <Search
                className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors group-focus-within:text-foreground"
                size={18}
              />
              <input
                type="text"
                placeholder={t(
                  'settings.members.searchPlaceholder',
                  'Search members...'
                )}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-none border-0 border-b border-border bg-transparent py-2 pl-7 pr-4 text-sm font-light text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus-visible:border-foreground focus-visible:ring-0"
              />
            </div>

            {canInvite && (
              <button
                onClick={() => setInviteOpen(true)}
                className="inline-flex items-center gap-2 rounded-sm bg-foreground px-4 py-2 font-mono text-xs uppercase tracking-wider text-background transition-colors hover:bg-foreground/90"
              >
                <Plus size={14} />
                {t('settings.members.inviteMember', 'Invite Member')}
              </button>
            )}
          </div>

          <div className="rounded-sm border">
            {/* Loading */}
            {isLoading && (
              <div className="divide-y">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 p-4">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            )}

            {/* Error */}
            {error && !isLoading && (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <AlertTriangle size={32} className="mb-3 text-destructive" />
                <p className="text-sm text-muted-foreground">
                  {t(
                    'settings.members.loadError',
                    'Failed to load members'
                  )}
                </p>
              </div>
            )}

            {/* Empty */}
            {!isLoading && !error && filteredMembers.length === 0 && (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <Users
                  size={32}
                  className="mb-3 text-muted-foreground/50"
                />
                <p className="text-sm text-muted-foreground">
                  {searchQuery
                    ? t(
                        'settings.members.noResults',
                        'No members match your search'
                      )
                    : t(
                        'settings.members.empty',
                        'No members found'
                      )}
                </p>
              </div>
            )}

            {/* Table */}
            {!isLoading && !error && filteredMembers.length > 0 && (
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className={`${TH_CLASS} w-[25%]`}>
                      {t('settings.members.columns.name', 'Name')}
                    </th>
                    <th className={`${TH_CLASS} w-[30%]`}>
                      {t('settings.members.columns.email', 'Email')}
                    </th>
                    <th className={`${TH_CLASS} w-[15%]`}>
                      {t('settings.members.columns.role', 'Role')}
                    </th>
                    <th className={`${TH_CLASS} w-[15%]`}>
                      {t('settings.members.columns.status', 'Status')}
                    </th>
                    {hasAnyAction && (
                      <th className={`${TH_CLASS} w-[15%]`}></th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredMembers.map((member) => (
                    <tr
                      key={member.id}
                      className="border-b last:border-0 hover:bg-muted/50"
                    >
                      <td className="p-4">
                        <span className="font-medium">
                          {member.user?.fullName || '—'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap p-4 font-mono text-sm text-muted-foreground">
                        {member.user?.email}
                      </td>
                      <td className="whitespace-nowrap p-4">
                        <RoleBadge role={member.role} />
                      </td>
                      <td className="whitespace-nowrap p-4">
                        <StatusIndicator
                          status={formatMembershipStatus(
                            member.membershipStatus,
                            member.user?.status
                          )}
                        />
                      </td>
                      {hasAnyAction && (
                        <td className="p-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button className="rounded-sm p-1 hover:bg-muted">
                                <MoreHorizontal size={16} />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canUpdateRole &&
                                WORKSPACE_ROLES.filter(
                                  (r) => r !== member.role
                                ).map((role) => (
                                  <DropdownMenuItem
                                    key={role}
                                    onClick={() =>
                                      handleChangeRole(member, role)
                                    }
                                  >
                                    <ShieldCheck
                                      size={14}
                                      className="mr-2"
                                    />
                                    {t(
                                      `settings.members.actions.make${role.charAt(0)}${role.slice(1).toLowerCase()}`,
                                      `Make ${role.charAt(0)}${role.slice(1).toLowerCase()}`
                                    )}
                                  </DropdownMenuItem>
                                ))}
                              {canUpdateRole && canRemove && (
                                <DropdownMenuSeparator />
                              )}
                              {canRemove && (
                                <DropdownMenuItem
                                  onClick={() => handleRemove(member)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 size={14} className="mr-2" />
                                  {t(
                                    'settings.members.actions.remove',
                                    'Remove'
                                  )}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <InviteWorkspaceMemberDialog
        open={inviteOpen}
        onOpenChange={setInviteOpen}
      />
      <RemoveWorkspaceMemberDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        member={selectedMember}
      />
    </>
  )
}
