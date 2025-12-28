import { useAuthStore } from '@/stores/auth-store';

/**
 * Hook to check if the current user can access the Admin Console.
 * Returns true if the user has SUPERADMIN or PLATFORM_ADMIN role.
 */
export const useCanAccessAdmin = () => {
  const canAccessAdmin = useAuthStore((state) => state.canAccessAdmin);
  const isSuperAdmin = useAuthStore((state) => state.isSuperAdmin);
  const getSystemRole = useAuthStore((state) => state.getSystemRole);

  return {
    canAccessAdmin: canAccessAdmin(),
    isSuperAdmin: isSuperAdmin(),
    systemRole: getSystemRole()
  };
};
