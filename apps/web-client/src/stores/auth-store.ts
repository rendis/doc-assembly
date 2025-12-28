import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface UserRole {
  type: 'SYSTEM' | 'TENANT' | 'WORKSPACE';
  role: string;
  resourceId: string | null;
}

interface AuthState {
  token: string | null;
  systemRoles: UserRole[];
  setToken: (token: string | null) => void;
  setSystemRoles: (roles: UserRole[]) => void;
  isAuthenticated: () => boolean;
  isSuperAdmin: () => boolean;
  isPlatformAdmin: () => boolean;
  canAccessAdmin: () => boolean;
  getSystemRole: () => string | null;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      systemRoles: [],
      setToken: (token) => set({ token }),
      setSystemRoles: (roles) => set({ systemRoles: roles }),
      isAuthenticated: () => !!get().token,
      isSuperAdmin: () => {
        return get().systemRoles.some(r => r.type === 'SYSTEM' && r.role === 'SUPERADMIN');
      },
      isPlatformAdmin: () => {
        return get().systemRoles.some(r => r.type === 'SYSTEM' && r.role === 'PLATFORM_ADMIN');
      },
      canAccessAdmin: () => {
        const roles = get().systemRoles;
        return roles.some(r =>
          r.type === 'SYSTEM' &&
          (r.role === 'SUPERADMIN' || r.role === 'PLATFORM_ADMIN')
        );
      },
      getSystemRole: () => {
        const systemRole = get().systemRoles.find(r => r.type === 'SYSTEM');
        return systemRole?.role ?? null;
      }
    }),
    {
      name: 'auth-storage',
    }
  )
);
