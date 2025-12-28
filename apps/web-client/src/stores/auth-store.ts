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
      }
    }),
    {
      name: 'auth-storage',
    }
  )
);
