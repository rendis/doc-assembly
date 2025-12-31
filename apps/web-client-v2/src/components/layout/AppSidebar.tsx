import { Link, useLocation } from '@tanstack/react-router'
import { LayoutGrid, FileText, FolderOpen, Settings, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/common/Logo'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/stores/auth-store'
import { useAppContextStore } from '@/stores/app-context-store'
import { useSidebarStore } from '@/stores/sidebar-store'
import { getInitials } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface NavItem {
  label: string
  icon: typeof LayoutGrid
  href: string
}

export function AppSidebar() {
  const { t } = useTranslation()
  const location = useLocation()
  const { userProfile, clearAuth } = useAuthStore()
  const { currentWorkspace, clearContext } = useAppContextStore()
  const { isCollapsed, closeMobile } = useSidebarStore()

  const workspaceId = currentWorkspace?.id || ''

  const navItems: NavItem[] = [
    {
      label: t('nav.dashboard'),
      icon: LayoutGrid,
      href: `/workspace/${workspaceId}`,
    },
    {
      label: t('nav.templates'),
      icon: FileText,
      href: `/workspace/${workspaceId}/templates`,
    },
    {
      label: t('nav.documents'),
      icon: FolderOpen,
      href: `/workspace/${workspaceId}/documents`,
    },
    {
      label: t('nav.settings'),
      icon: Settings,
      href: `/workspace/${workspaceId}/settings`,
    },
  ]

  const displayName = userProfile
    ? `${userProfile.firstName || ''} ${userProfile.lastName || ''}`.trim() ||
      userProfile.username ||
      'User'
    : 'User'

  const email = userProfile?.email || 'user@example.com'
  const initials = getInitials(displayName)

  const handleLogout = () => {
    clearAuth()
    clearContext()
    closeMobile()
  }

  const isActive = (href: string) => {
    // Exact match for dashboard (index route)
    if (href === `/workspace/${workspaceId}`) {
      return location.pathname === href
    }
    // Starts with for other routes
    return location.pathname.startsWith(href)
  }

  return (
    <aside
      className={cn(
        'flex h-full flex-col border-r bg-sidebar-background',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex h-16 items-center gap-3 border-b px-6">
        <Logo showText={!isCollapsed} size="md" />
      </div>

      <ScrollArea className="flex-1 px-4 py-6">
        {/* Current Workspace */}
        {!isCollapsed && currentWorkspace && (
          <div className="mb-8 px-2">
            <label className="mb-2 block text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              {t('workspace.current')}
            </label>
            <div className="truncate font-display text-lg font-medium">
              {currentWorkspace.name}
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const active = isActive(item.href)
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={closeMobile}
                className={cn(
                  'group flex w-full items-center gap-4 rounded-md px-3 py-3 text-sm font-medium transition-colors',
                  active
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                  isCollapsed && 'justify-center px-2'
                )}
              >
                <item.icon
                  size={20}
                  strokeWidth={1.5}
                  className={cn(
                    'shrink-0',
                    active
                      ? 'text-sidebar-accent-foreground'
                      : 'text-muted-foreground group-hover:text-sidebar-accent-foreground'
                  )}
                />
                {!isCollapsed && item.label}
              </Link>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-4">
        <button
          onClick={handleLogout}
          className={cn(
            'group flex w-full items-center gap-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
            isCollapsed && 'justify-center'
          )}
        >
          <LogOut
            size={20}
            strokeWidth={1.5}
            className="shrink-0 transition-transform group-hover:-translate-x-1"
          />
          {!isCollapsed && t('nav.logout')}
        </button>

        {!isCollapsed && (
          <>
            <Separator className="my-4" />
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold">{email}</div>
                <div className="text-[10px] uppercase text-muted-foreground">
                  {currentWorkspace?.role || 'Member'}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
  )
}
