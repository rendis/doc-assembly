import { Link, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { usePermission } from '@/features/auth/hooks/usePermission';
import { Permission } from '@/features/auth/rbac/rules';
import {
  LayoutDashboard,
  Settings,
  Users,
  Building
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/ui/logo';
import { useSidebar } from '@/hooks/useSidebar';
import { SidebarToggleButton } from './SidebarToggleButton';

export const AppSidebar = () => {
  const { t } = useTranslation();
  const { can } = usePermission();
  const location = useLocation();
  const {
    isExpanded,
    isPinned,
    togglePin,
    handleMouseEnter,
    handleMouseLeave,
  } = useSidebar({ type: 'app' });

  const menuItems = [
    {
      icon: Building,
      label: t('auth.organizations', { defaultValue: 'Organizations' }),
      to: '/select-tenant',
      permission: null
    },
    {
      icon: LayoutDashboard,
      label: t('workspace.title', { defaultValue: 'Workspaces' }),
      to: '/',
      permission: null // Public / All authenticated
    },
    {
      icon: Users,
      label: t('common.members'),
      to: '/members',
      permission: Permission.MEMBERS_VIEW
    },
    {
      icon: Settings,
      label: t('common.settings'),
      to: '/settings', // Placeholder route
      permission: Permission.TENANT_MANAGE_SETTINGS // Example
    }
  ];

  return (
    <aside
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "flex flex-col border-r bg-card text-card-foreground transition-all duration-300 ease-in-out h-screen sticky top-0 relative",
        isExpanded ? "w-64" : "w-16"
      )}
    >
      {/* Floating Toggle Button */}
      <SidebarToggleButton
        isPinned={isPinned}
        isExpanded={isExpanded}
        onTogglePin={togglePin}
        ariaLabel={isPinned ? t('sidebar.unpin') : t('sidebar.pin')}
        title={isPinned ? t('sidebar.unpin') : t('sidebar.pin')}
      />

      {/* Header / Logo */}
      <div className={cn(
        "flex h-14 items-center border-b p-2",
        isExpanded ? "justify-between" : "justify-center"
      )}>
        <Logo
          size="sm"
          showText={isExpanded}
          className={cn(
            "rounded-md py-2",
            isExpanded ? "px-3" : "justify-center px-2"
          )}
        />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {menuItems.map((item) => {
          if (item.permission && !can(item.permission)) return null;

          const isActive = location.pathname === item.to;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                isActive && "bg-accent text-accent-foreground",
                !isExpanded && "justify-center px-2"
              )}
              title={!isExpanded ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {isExpanded && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
