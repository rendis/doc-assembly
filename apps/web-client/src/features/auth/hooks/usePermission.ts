import { useAppContextStore } from '@/stores/app-context-store';
import { useAuthStore } from '@/stores/auth-store';
import { WORKSPACE_RULES, TENANT_RULES, SYSTEM_RULES, Permission, WorkspaceRole, TenantRole, SystemRole } from '../rbac/rules';

export const usePermission = () => {
  const { currentWorkspace, currentTenant } = useAppContextStore();
  const { systemRoles } = useAuthStore();

  const can = (permission: Permission): boolean => {
    // 0. Check System Roles first
    const systemRole = systemRoles.find(r => r.type === 'SYSTEM');
    if (systemRole) {
      const role = systemRole.role as SystemRole;
      const systemPermissions = SYSTEM_RULES[role] || [];

      // SUPERADMIN has access to everything
      if (role === SystemRole.SUPERADMIN) {
        return true;
      }

      // Check if this system role has the specific permission
      if (systemPermissions.includes(permission)) {
        return true;
      }
    }

    // 1. Check Workspace Permissions
    if (currentWorkspace?.role) {
      const role = currentWorkspace.role as WorkspaceRole;
      const permissions = WORKSPACE_RULES[role] || [];
      if (permissions.includes(permission)) return true;
    }

    // 2. Check Tenant Permissions
    if (currentTenant?.role) {
      const role = currentTenant.role as TenantRole;
      const permissions = TENANT_RULES[role] || [];
      if (permissions.includes(permission)) return true;
    }

    return false;
  };

  const getSystemRole = (): SystemRole | null => {
    const systemRole = systemRoles.find(r => r.type === 'SYSTEM');
    return (systemRole?.role as SystemRole) ?? null;
  };

  return {
    can,
    role: currentWorkspace?.role || currentTenant?.role,
    systemRole: getSystemRole()
  };
};