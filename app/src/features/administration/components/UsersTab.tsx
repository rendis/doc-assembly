import { Skeleton } from '@/components/ui/skeleton'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useToast } from '@/components/ui/use-toast'
import { usePermission } from '@/features/auth/hooks/usePermission'
import { getApiErrorMessage } from '@/lib/api-client'
import { useAuthStore } from '@/stores/auth-store'
import { cn } from '@/lib/utils'
import {
  AlertTriangle,
  MoreHorizontal,
  Search,
  ShieldCheck,
  Trash2,
  Users,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { SystemUser } from '@/types/api'
import { RemoveSystemUserRoleDialog } from './RemoveSystemUserRoleDialog'
import { useSystemUsers, useUpdateSystemUserRole } from '../hooks/useSystemUsers'

const TH_CLASS = 'p-4 text-left font-mono text-xs uppercase tracking-widest text-muted-foreground'

function RoleBadge({ role }: { role: string }) {
  const isSuperAdmin = role === 'SUPERADMIN'
  return (
    <span
      className={cn(
        'inline-flex min-w-[120px] items-center justify-center gap-1.5 rounded-sm border px-2 py-0.5 font-mono text-xs uppercase',
        isSuperAdmin
          ? 'border-primary/30 bg-primary/10 text-primary'
          : 'border-border bg-muted text-muted-foreground'
      )}
    >
      {role.replace('_', ' ')}
    </span>
  )
}

function StatusIndicator({ status }: { status: string }) {
  const normalizedStatus = status?.toUpperCase?.() ?? 'UNKNOWN'
  const isActive = normalizedStatus === 'ACTIVE'

  return (
    <span className="inline-flex items-center gap-1.5 font-mono text-xs">
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          isActive ? 'bg-green-500' : 'bg-yellow-500'
        )}
      />
      <span className={isActive ? 'text-green-600 dark:text-green-400' : 'text-yellow-600 dark:text-yellow-400'}>
        {normalizedStatus}
      </span>
    </span>
  )
}

export function UsersTab(): React.ReactElement {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { userProfile } = useAuthStore()
  const { hasPermission, Permission } = usePermission()

  const canManageUsers = hasPermission(Permission.SYSTEM_USERS_MANAGE)

  const [searchQuery, setSearchQuery] = useState('')
  const [removeOpen, setRemoveOpen] = useState(false)
  const [selectedUser, setSelectedUser] = useState<SystemUser | null>(null)

  const { data, isLoading, error } = useSystemUsers()
  const updateRoleMutation = useUpdateSystemUserRole()

  const systemUsers = data?.data ?? []
  const superAdminCount = systemUsers.filter((user) => user.role === 'SUPERADMIN').length

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return systemUsers
    const q = searchQuery.toLowerCase()
    return systemUsers.filter(
      (user) =>
        user.user?.fullName?.toLowerCase()?.includes(q) ||
        user.user?.email?.toLowerCase()?.includes(q)
    )
  }, [searchQuery, systemUsers])

  const getLastSuperAdminReason = (systemUser: SystemUser): string | null => {
    if (systemUser.role !== 'SUPERADMIN' || superAdminCount > 1) return null
    if (systemUser.userId === userProfile?.id) {
      return t(
        'administration.users.guards.lastSuperAdminSelf',
        'No puedes quitarte el último rol SUPERADMIN del sistema.'
      )
    }
    return t(
      'administration.users.guards.lastSuperAdmin',
      'Debe existir al menos un SUPERADMIN en el sistema.'
    )
  }

  const handleToggleRole = async (systemUser: SystemUser) => {
    const disabledReason = getLastSuperAdminReason(systemUser)
    if (disabledReason) {
      toast({
        variant: 'destructive',
        title: t('common.error', 'Error'),
        description: disabledReason,
      })
      return
    }

    const newRole = systemUser.role === 'SUPERADMIN' ? 'PLATFORM_ADMIN' : 'SUPERADMIN'

    try {
      await updateRoleMutation.mutateAsync({ userId: systemUser.userId, role: newRole })
      toast({
        title: t('administration.users.roleUpdated', 'Role updated'),
      })
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error', 'Error'),
        description: getApiErrorMessage(error),
      })
    }
  }

  const handleRemove = (systemUser: SystemUser) => {
    setSelectedUser(systemUser)
    setRemoveOpen(true)
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          {t('administration.users.description', 'Manage system users and their roles.')}
        </p>
        {!canManageUsers && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <AlertTriangle size={14} />
            {t(
              'administration.users.readOnlyWarning',
              'You have read-only access. Only SUPERADMIN can modify system roles.'
            )}
          </div>
        )}
      </div>

      <div className="group relative w-full md:max-w-xs">
        <Search
          className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors group-focus-within:text-foreground"
          size={18}
        />
        <input
          type="text"
          placeholder={t('administration.users.searchPlaceholder', 'Search users...')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-none border-0 border-b border-border bg-transparent py-2 pl-7 pr-4 text-sm font-light text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus-visible:border-foreground focus-visible:ring-0"
        />
      </div>

      <div className="rounded-sm border">
        {isLoading && (
          <div className="divide-y">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        )}

        {error && !isLoading && (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <AlertTriangle size={32} className="mb-3 text-destructive" />
            <p className="text-sm text-muted-foreground">
              {t('administration.users.loadError', 'Failed to load system users')}
            </p>
          </div>
        )}

        {!isLoading && !error && filteredUsers.length === 0 && (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Users size={32} className="mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">
              {searchQuery
                ? t('administration.users.noResults', 'No users match your search')
                : t('administration.users.empty', 'No system users found')}
            </p>
          </div>
        )}

        {!isLoading && !error && filteredUsers.length > 0 && (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className={`${TH_CLASS} w-[25%]`}>
                  {t('administration.users.columns.name', 'Name')}
                </th>
                <th className={`${TH_CLASS} w-[30%]`}>
                  {t('administration.users.columns.email', 'Email')}
                </th>
                <th className={`${TH_CLASS} w-[20%]`}>
                  {t('administration.users.columns.role', 'Role')}
                </th>
                <th className={`${TH_CLASS} w-[15%]`}>
                  {t('administration.users.columns.status', 'Status')}
                </th>
                <th className={`${TH_CLASS} w-[10%]`}></th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((systemUser) => {
                const disabledReason = getLastSuperAdminReason(systemUser)

                return (
                  <tr key={systemUser.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-4">
                      <span className="font-medium">{systemUser.user?.fullName || '—'}</span>
                    </td>
                    <td className="whitespace-nowrap p-4 font-mono text-sm text-muted-foreground">
                      {systemUser.user?.email}
                    </td>
                    <td className="whitespace-nowrap p-4">
                      <RoleBadge role={systemUser.role} />
                    </td>
                    <td className="whitespace-nowrap p-4">
                      <StatusIndicator status={systemUser.user?.status ?? 'UNKNOWN'} />
                    </td>
                    <td className="p-4">
                      {canManageUsers && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="rounded-sm p-1 hover:bg-muted">
                              <MoreHorizontal size={16} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleToggleRole(systemUser)}
                              disabled={!!disabledReason || updateRoleMutation.isPending}
                            >
                              <ShieldCheck size={14} className="mr-2" />
                              {systemUser.role === 'SUPERADMIN'
                                ? t('administration.users.actions.makePlatformAdmin', 'Make Platform Admin')
                                : t('administration.users.actions.makeSuperAdmin', 'Make Superadmin')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleRemove(systemUser)}
                              disabled={!!disabledReason}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 size={14} className="mr-2" />
                              {t('administration.users.actions.remove', 'Remove')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <RemoveSystemUserRoleDialog
        open={removeOpen}
        onOpenChange={setRemoveOpen}
        systemUser={selectedUser}
        disabledReason={selectedUser ? getLastSuperAdminReason(selectedUser) : null}
      />
    </div>
  )
}
