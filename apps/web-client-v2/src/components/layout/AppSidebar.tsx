import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { LayoutGrid, FileText, FolderOpen, Settings, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/stores/auth-store'
import { useAppContextStore } from '@/stores/app-context-store'
import { useSidebarStore } from '@/stores/sidebar-store'
import { logout } from '@/lib/keycloak'
import { getInitials } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface NavItem {
  label: string
  icon: typeof LayoutGrid
  href: string
}

const navItemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 },
}

const footerItemVariants = {
  hidden: { opacity: 0, scale: 0 },
  visible: { opacity: 1, scale: 1 },
}

export function AppSidebar() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { userProfile } = useAuthStore()
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

  const handleLogout = async () => {
    closeMobile()
    clearContext()
    await logout()
    navigate({ to: '/login' })
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
        'relative flex h-full flex-col bg-sidebar-background pt-16',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Línea derecha animada - de arriba hacia abajo */}
      <motion.div
        className="absolute right-0 top-0 bottom-0 w-px bg-border origin-top"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      />
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
          {navItems.map((item, index) => {
            const active = isActive(item.href)
            return (
              <motion.div
                key={item.href}
                variants={navItemVariants}
                initial="hidden"
                animate="visible"
                transition={{ duration: 0.3, delay: 0.8 + index * 0.08 }}
              >
                <Link
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
              </motion.div>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="border-t p-4">
        <motion.div
          variants={footerItemVariants}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.3, delay: 0.8 }}
        >
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
        </motion.div>

        {!isCollapsed && (
          <motion.div
            variants={footerItemVariants}
            initial="hidden"
            animate="visible"
            transition={{ duration: 0.3, delay: 0.88 }}
          >
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
          </motion.div>
        )}
      </div>
    </aside>
  )
}
