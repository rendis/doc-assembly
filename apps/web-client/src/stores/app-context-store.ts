import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Tenant } from '@/features/tenants/types';
import type { Workspace } from '@/features/workspaces/types';

interface AppContextState {
  currentTenant: Tenant | null;
  currentWorkspace: Workspace | null;
  setTenant: (tenant: Tenant | null) => void;
  setWorkspace: (workspace: Workspace | null) => void;
  clearContext: () => void;
  isSystemContext: () => boolean;
}

export const useAppContextStore = create<AppContextState>()(
  persist(
    (set, get) => ({
      currentTenant: null,
      currentWorkspace: null,
      setTenant: (tenant) => set({ currentTenant: tenant, currentWorkspace: null }),
      setWorkspace: (workspace) => set({ currentWorkspace: workspace }),
      clearContext: () => set({ currentTenant: null, currentWorkspace: null }),
      isSystemContext: () => get().currentTenant?.code === 'SYS'
    }),
    {
      name: 'app-context-storage',
      onRehydrateStorage: () => (state) => {
        // Migración: Limpiar ID antiguo 'system-global' si existe
        if (state?.currentTenant?.id === 'system-global') {
            console.warn('Migrating legacy system tenant ID. Clearing context.');
            state.setTenant(null);
        }
      }
    }
  )
);