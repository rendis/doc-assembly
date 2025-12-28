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
      label: 'Members', 
      to: '/members', 
      permission: Permission.MEMBERS_VIEW
    },
    {
      icon: Settings,
      label: 'Settings',
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
      <div className="flex h-14 items-center justify-between px-4 border-b">
        {!isCollapsed && <span className="font-bold text-lg tracking-tight truncate">Doc Assembly</span>}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="rounded p-1 hover:bg-accent hover:text-accent-foreground"
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </button>
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

      {/* Footer (Optional) */}
      <div className="border-t p-2">
        {/* Could add user profile summary here if expanded */}
      </div>
    </aside>
  );
};
