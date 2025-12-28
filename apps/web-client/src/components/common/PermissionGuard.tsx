import { Permission } from '@/features/auth/rbac/rules';
import { usePermission } from '@/features/auth/hooks/usePermission';

interface PermissionGuardProps {
  permission: Permission;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const PermissionGuard = ({ permission, children, fallback = null }: PermissionGuardProps) => {
  const { can } = usePermission();

  if (!can(permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
