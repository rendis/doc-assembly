import { useState } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { usePermission } from '@/features/auth/hooks/usePermission';
import { Permission } from '@/features/auth/rbac/rules';
import {
  LayoutDashboard,
  Settings,
  Users,
  ChevronLeft,
  ChevronRight,
  Building
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/ui/logo';

export const AppSidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { t } = useTranslation();
  const { can } = usePermission();
  const location = useLocation();

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
      className={cn(
        "flex flex-col border-r bg-card text-card-foreground transition-all duration-300 ease-in-out h-screen sticky top-0",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header / Logo */}
      <div className={cn(
        "flex h-14 items-center border-b p-2",
        isCollapsed ? "justify-center" : "justify-between"
      )}>
        <Logo
          size="sm"
          showText={!isCollapsed}
          className={cn(
            "rounded-md py-2",
            isCollapsed ? "justify-center px-2" : "px-3"
          )}
        />
        {!isCollapsed && (
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="rounded p-1 hover:bg-accent hover:text-accent-foreground shrink-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>
      {isCollapsed && (
        <div className="p-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex w-full items-center justify-center rounded-md px-2 py-2 hover:bg-accent hover:text-accent-foreground"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

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
                isCollapsed && "justify-center px-2"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!isCollapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};
