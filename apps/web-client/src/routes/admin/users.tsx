import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { systemUsersApi, type SystemUser } from '@/features/admin/api/system-users-api';
import { usePermission } from '@/features/auth/hooks/usePermission';
import { Permission } from '@/features/auth/rbac/rules';
import { Users, Loader2, Shield, ShieldAlert, Trash2, UserPlus } from 'lucide-react';

export const Route = createFileRoute('/admin/users')({
  component: AdminUsersPage,
});

function AdminUsersPage() {
  const { t } = useTranslation();
  const { can } = usePermission();
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const canManageUsers = can(Permission.SYSTEM_USERS_MANAGE);

  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await systemUsersApi.listSystemUsers();
        setUsers(data);
      } catch (err) {
        console.error('Failed to fetch system users', err);
        setError(t('admin.users.errorLoad'));
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [t]);

  const handleRevokeRole = async (userId: string) => {
    if (!confirm(t('admin.users.confirmRevoke'))) {
      return;
    }

    try {
      await systemUsersApi.revokeRole(userId);
      setUsers(users.filter((u) => u.id !== userId));
    } catch (err) {
      console.error('Failed to revoke role', err);
      alert(t('admin.users.errorRevoke'));
    }
  };

  const getRoleIcon = (role: string) => {
    if (role === 'SUPERADMIN') {
      return <ShieldAlert className="h-4 w-4 text-destructive" />;
    }
    return <Shield className="h-4 w-4 text-admin" />;
  };

  const getRoleBadgeClass = (role: string) => {
    if (role === 'SUPERADMIN') {
      return 'bg-destructive/10 text-destructive';
    }
    return 'bg-admin-muted text-admin-foreground';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t('admin.users.title', { defaultValue: 'System Users' })}
          </h1>
          <p className="text-muted-foreground">
            {t('admin.users.description', {
              defaultValue: 'Manage users with system-level roles',
            })}
          </p>
        </div>
        {canManageUsers && (
          <button className="inline-flex items-center justify-center gap-2 rounded-md bg-admin px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-admin/90 transition-colors">
            <UserPlus className="h-4 w-4" />
            {t('admin.users.addUser', { defaultValue: 'Add System User' })}
          </button>
        )}
      </div>

      {/* Info Card */}
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-start gap-3">
          <div className="rounded-full bg-admin-muted p-2">
            <Users className="h-5 w-5 text-admin" />
          </div>
          <div>
            <h3 className="font-medium">
              {t('admin.users.infoTitle', { defaultValue: 'About System Roles' })}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              {t('admin.users.infoDescription', {
                defaultValue:
                  'System roles grant platform-wide access. SUPERADMIN has full access to all features and tenants. PLATFORM_ADMIN can manage tenants but cannot assign system roles.',
              })}
            </p>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="rounded-lg border bg-card overflow-hidden">
        <table className="w-full caption-bottom text-sm text-left">
          <thead>
            <tr className="border-b bg-muted/50 transition-colors">
              <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                {t('admin.users.user', { defaultValue: 'User' })}
              </th>
              <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                {t('admin.users.role', { defaultValue: 'Role' })}
              </th>
              <th className="h-12 px-4 align-middle font-medium text-muted-foreground">
                {t('admin.users.assignedAt', { defaultValue: 'Assigned' })}
              </th>
              {canManageUsers && (
                <th className="h-12 px-4 align-middle font-medium text-muted-foreground text-right">
                  {t('admin.users.actions', { defaultValue: 'Actions' })}
                </th>
              )}
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {loading ? (
              <tr>
                <td colSpan={canManageUsers ? 4 : 3} className="h-24 text-center">
                  <div className="flex justify-center items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('common.loading', { defaultValue: 'Loading...' })}
                  </div>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td
                  colSpan={canManageUsers ? 4 : 3}
                  className="h-24 text-center text-muted-foreground"
                >
                  {t('admin.users.noResults', {
                    defaultValue: 'No system users found.',
                  })}
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr
                  key={user.id}
                  className="border-b transition-colors hover:bg-muted/50"
                >
                  <td className="p-4 align-middle">
                    <div>
                      <p className="font-medium">{user.name || 'Unknown'}</p>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                  </td>
                  <td className="p-4 align-middle">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${getRoleBadgeClass(user.role)}`}
                    >
                      {getRoleIcon(user.role)}
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4 align-middle text-muted-foreground">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </td>
                  {canManageUsers && (
                    <td className="p-4 align-middle text-right">
                      <button
                        onClick={() => handleRevokeRole(user.id)}
                        className="inline-flex items-center justify-center rounded-md text-sm font-medium hover:bg-destructive/10 hover:text-destructive h-8 w-8 p-0"
                        title={t('admin.users.revokeRole', {
                          defaultValue: 'Revoke Role',
                        })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Role Legend */}
      <div className="flex items-center gap-6 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 text-destructive" />
          <span>{t('admin.users.roleSuperadmin')}</span>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-admin" />
          <span>{t('admin.users.rolePlatformAdmin')}</span>
        </div>
      </div>
    </div>
  );
}
