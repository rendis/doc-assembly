import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useCanAccessAdmin } from '@/features/auth/hooks/useCanAccessAdmin';
import { Building, Users, Settings, Activity } from 'lucide-react';

export const Route = createFileRoute('/admin/')({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { t } = useTranslation();
  const { systemRole, isSuperAdmin } = useCanAccessAdmin();

  const stats = [
    {
      label: t('admin.stats.tenants'),
      value: '-',
      icon: Building,
      description: t('admin.stats.tenantsDesc'),
    },
    {
      label: t('admin.stats.users'),
      value: '-',
      icon: Users,
      description: t('admin.stats.usersDesc'),
    },
    {
      label: t('admin.stats.settings'),
      value: '-',
      icon: Settings,
      description: t('admin.stats.settingsDesc'),
    },
    {
      label: t('admin.stats.activity'),
      value: '-',
      icon: Activity,
      description: t('admin.stats.activityDesc'),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t('admin.dashboard', { defaultValue: 'Admin Dashboard' })}
        </h1>
        <p className="text-muted-foreground">
          {t('admin.dashboardDescription', {
            defaultValue: 'Platform overview and quick actions',
          })}
        </p>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {t('admin.currentRole', { defaultValue: 'Your role:' })}
          </span>
          <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
            {systemRole}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="rounded-lg border bg-card p-6 shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="rounded-full bg-purple-100 p-3 dark:bg-purple-900/30">
                <stat.icon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">
                  {stat.label}
                </p>
                <p className="text-2xl font-bold">{stat.value}</p>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {stat.description}
            </p>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4">
          {t('admin.quickActions', { defaultValue: 'Quick Actions' })}
        </h2>
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <a
            href="/admin/tenants"
            className="flex items-center gap-3 rounded-lg border p-4 hover:bg-accent transition-colors"
          >
            <Building className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {t('admin.manageTenants', { defaultValue: 'Manage Tenants' })}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('admin.manageTenantsDesc', {
                  defaultValue: 'View and manage organizations',
                })}
              </p>
            </div>
          </a>

          {isSuperAdmin && (
            <a
              href="/admin/users"
              className="flex items-center gap-3 rounded-lg border p-4 hover:bg-accent transition-colors"
            >
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">
                  {t('admin.manageUsers', { defaultValue: 'System Users' })}
                </p>
                <p className="text-sm text-muted-foreground">
                  {t('admin.manageUsersDesc', {
                    defaultValue: 'Manage system-level roles',
                  })}
                </p>
              </div>
            </a>
          )}

          <a
            href="/admin/audit"
            className="flex items-center gap-3 rounded-lg border p-4 hover:bg-accent transition-colors"
          >
            <Activity className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">
                {t('admin.viewAudit', { defaultValue: 'Audit Logs' })}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('admin.viewAuditDesc', {
                  defaultValue: 'Review platform activity',
                })}
              </p>
            </div>
          </a>
        </div>
      </div>

      {/* Placeholder Notice */}
      <div className="rounded-lg border border-dashed border-yellow-500/50 bg-yellow-50/50 p-4 dark:bg-yellow-900/10">
        <p className="text-sm text-yellow-800 dark:text-yellow-200">
          <strong>Note:</strong> This dashboard is a placeholder. Stats and
          metrics will be populated once the corresponding API endpoints are
          implemented.
        </p>
      </div>
    </div>
  );
}
