import { useAppContextStore } from '@/stores/app-context-store';
import { useAuthStore } from '@/stores/auth-store';
import { WORKSPACE_RULES, TENANT_RULES, Permission, WorkspaceRole, TenantRole, SystemRole } from '../rbac/rules';

export const usePermission = () => {
  const { currentWorkspace, currentTenant } = useAppContextStore();
  const { systemRoles } = useAuthStore();

  const can = (permission: Permission): boolean => {
    // 0. Check System Roles (God Mode)
    const isSuperAdmin = systemRoles.some(r => r.type === 'SYSTEM' && r.role === SystemRole.SUPERADMIN);
    if (isSuperAdmin) {
      return true; 
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

  return { can, role: currentWorkspace?.role || currentTenant?.role };
};