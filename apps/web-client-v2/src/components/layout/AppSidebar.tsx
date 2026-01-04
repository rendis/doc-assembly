import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { LayoutGrid, FileText, FolderOpen, Settings, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useAuthStore } from '@/stores/auth-store'
import { useAppContextStore } from '@/stores/app-context-store'
import { useSidebarStore } from '@/stores/sidebar-store'
import { logout } from '@/lib/keycloak'
import { getInitials } from '@/lib/utils'
import { useTranslation } from 'react-i18next'
import { SidebarToggleButton } from './SidebarToggleButton'

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
  const { isPinned, isHovering, closeMobile } = useSidebarStore()

  const isExpanded = isPinned || isHovering

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
    <motion.aside
      initial={false}
      animate={{ width: isExpanded ? 256 : 64 }}
      transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
      className="relative flex h-full flex-col overflow-visible bg-sidebar-background pt-16"
    >
      {/* Toggle button - only visible on desktop */}
      <div className="hidden lg:block">
        <SidebarToggleButton />
      </div>

      {/* Línea derecha animada - de arriba hacia abajo */}
      <motion.div
        className="absolute right-0 top-0 bottom-0 w-px bg-border origin-top"
        initial={{ scaleY: 0 }}
        animate={{ scaleY: 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      />
      <ScrollArea className={cn('flex-1 py-6', isExpanded ? 'px-4' : 'px-2')}>
        {/* Current Workspace */}
        {currentWorkspace && (
          <div className="relative mb-8 h-10 px-1">
            {/* Avatar - visible solo cuando colapsado */}
            <motion.div
              initial={false}
              animate={{
                opacity: isExpanded ? 0 : 1,
                scale: isExpanded ? 0.8 : 1,
              }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="absolute inset-0 flex items-center"
              style={{ pointerEvents: isExpanded ? 'none' : 'auto' }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <Avatar className="h-10 w-10 cursor-default">
                    <AvatarFallback className="bg-primary/10 text-sm font-bold">
                      {getInitials(currentWorkspace.name)}
                    </AvatarFallback>
                  </Avatar>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={8}>
                  <div className="text-xs text-muted-foreground">
                    {t('workspace.current')}
                  </div>
                  <div className="font-medium">{currentWorkspace.name}</div>
                </TooltipContent>
              </Tooltip>
            </motion.div>

            {/* Texto - visible solo cuando expandido */}
            <motion.div
              initial={false}
              animate={{
                opacity: isExpanded ? 1 : 0,
                x: isExpanded ? 0 : -10,
              }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="flex h-full items-center"
              style={{ pointerEvents: isExpanded ? 'auto' : 'none' }}
            >
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
                  {t('workspace.current')}
                </label>
                <div className="truncate font-display text-lg font-medium">
                  {currentWorkspace.name}
                </div>
              </div>
            </motion.div>
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
                      : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
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
                  <motion.span
                    initial={false}
                    animate={{
                      opacity: isExpanded ? 1 : 0,
                      width: isExpanded ? 'auto' : 0,
                    }}
                    transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden whitespace-nowrap"
                  >
                    {item.label}
                  </motion.span>
                </Link>
              </motion.div>
            )
          })}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className={cn('border-t py-4', isExpanded ? 'px-4' : 'px-2')}>
        {/* User profile */}
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Avatar className="h-8 w-8 shrink-0 cursor-default">
                <AvatarFallback className="text-xs font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </TooltipTrigger>
            {!isExpanded && (
              <TooltipContent side="right" sideOffset={8}>
                <div className="font-medium">{email}</div>
                <div className="text-xs text-muted-foreground">
                  {currentWorkspace?.role || 'Member'}
                </div>
              </TooltipContent>
            )}
          </Tooltip>

          <motion.div
            initial={false}
            animate={{
              opacity: isExpanded ? 1 : 0,
              width: isExpanded ? 'auto' : 0,
            }}
            transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
            className="min-w-0 overflow-hidden"
          >
            <div className="truncate text-xs font-semibold whitespace-nowrap">
              {email}
            </div>
            <div className="text-[10px] uppercase text-muted-foreground whitespace-nowrap">
              {currentWorkspace?.role || 'Member'}
            </div>
          </motion.div>
        </div>

        {/* Logout button */}
        <motion.div
          variants={footerItemVariants}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.3, delay: 0.8 }}
        >
          <button
            onClick={handleLogout}
            className="group flex w-full items-center gap-4 rounded-md px-3 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <LogOut
              size={20}
              strokeWidth={1.5}
              className="shrink-0 transition-transform group-hover:-translate-x-1"
            />
            <motion.span
              initial={false}
              animate={{
                opacity: isExpanded ? 1 : 0,
                width: isExpanded ? 'auto' : 0,
              }}
              transition={{ duration: 0.15, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden whitespace-nowrap"
            >
              {t('nav.logout')}
            </motion.span>
          </button>
        </motion.div>
      </div>
    </motion.aside>
  )
}
