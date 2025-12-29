import { useState } from 'react';
import { Link, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { usePermission } from '@/features/auth/hooks/usePermission';
import { Permission } from '@/features/auth/rbac/rules';
import {
  LayoutDashboard,
  Building,
  Users,
  Settings,
  ScrollText,
  ChevronLeft,
  ChevronRight,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const AdminSidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { t } = useTranslation();
  const { can } = usePermission();
  const location = useLocation();

  const menuItems = [
    {
      icon: LayoutDashboard,
      label: t('admin.dashboard', { defaultValue: 'Dashboard' }),
      to: '/admin',
      permission: Permission.ADMIN_ACCESS
    },
    {
      icon: Building,
      label: t('admin.tenants', { defaultValue: 'Tenants' }),
      to: '/admin/tenants',
      permission: Permission.SYSTEM_TENANTS_VIEW
    },
    {
      icon: Users,
      label: t('admin.systemUsers', { defaultValue: 'System Users' }),
      to: '/admin/users',
      permission: Permission.SYSTEM_USERS_VIEW
    },
    {
      icon: Settings,
      label: t('admin.platformSettings', { defaultValue: 'Platform Settings' }),
      to: '/admin/settings',
      permission: Permission.SYSTEM_SETTINGS_VIEW
    },
    {
      icon: ScrollText,
      label: t('admin.auditLogs', { defaultValue: 'Audit Logs' }),
      to: '/admin/audit',
      permission: Permission.SYSTEM_AUDIT_VIEW
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
      <div className="flex h-14 items-center justify-between px-4 border-b bg-admin-muted">
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-admin" />
            <span className="font-bold text-lg tracking-tight truncate text-admin-foreground">
              {t('navigation.admin')}
            </span>
          </div>
        )}
        {isCollapsed && <Shield className="h-5 w-5 text-admin mx-auto" />}
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

          const isActive = location.pathname === item.to ||
            (item.to !== '/admin' && location.pathname.startsWith(item.to));

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                "hover:bg-admin-muted hover:text-admin-foreground",
                isActive && "bg-admin-muted text-admin-foreground",
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

      {/* Footer */}
      <div className="border-t p-2 text-xs text-muted-foreground text-center">
        {!isCollapsed && <span>{t('navigation.adminConsole')}</span>}
      </div>
    </aside>
  );
};
