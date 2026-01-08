import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Re-export types from features for backwards compatibility
export type { Tenant, TenantWithRole, TenantSettings } from '@/features/tenants/types'
export type {
  Workspace,
  WorkspaceWithRole,
  WorkspaceSettings,
  WorkspaceType,
  WorkspaceStatus,
} from '@/features/workspaces/types'

// Import types for internal use
import type { TenantWithRole } from '@/features/tenants/types'
import type { WorkspaceWithRole } from '@/features/workspaces/types'

/**
 * App context store state
 */
export interface AppContextState {
  // State
  currentTenant: TenantWithRole | null
  currentWorkspace: WorkspaceWithRole | null

  // Actions
  setTenant: (tenant: TenantWithRole | null) => void
  setWorkspace: (workspace: WorkspaceWithRole | null) => void
  setCurrentTenant: (tenant: TenantWithRole | null) => void
  setCurrentWorkspace: (workspace: WorkspaceWithRole | null) => void
  clearContext: () => void

  // Computed
  isSystemContext: () => boolean
  hasTenant: () => boolean
  hasWorkspace: () => boolean
}

/**
 * App context store with persistence
 */
export const useAppContextStore = create<AppContextState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentTenant: null,
      currentWorkspace: null,

      // Actions
      setTenant: (tenant) =>
        set({
          currentTenant: tenant,
          currentWorkspace: null, // Clear workspace when tenant changes
        }),

      setWorkspace: (workspace) => set({ currentWorkspace: workspace }),

      // Aliases
      setCurrentTenant: (tenant) =>
        set({
          currentTenant: tenant,
          currentWorkspace: null,
        }),

      setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),

      clearContext: () =>
        set({
          currentTenant: null,
          currentWorkspace: null,
        }),

      // Computed
      isSystemContext: () => {
        const { currentWorkspace } = get()
        return currentWorkspace?.type === 'SYSTEM'
      },

      hasTenant: () => {
        const { currentTenant } = get()
        return currentTenant !== null
      },

      hasWorkspace: () => {
        const { currentWorkspace } = get()
        return currentWorkspace !== null
      },
    }),
    {
      name: 'doc-assembly-context',
      partialize: (state) => ({
        currentTenant: state.currentTenant,
        currentWorkspace: state.currentWorkspace,
      }),
    }
  )
)

/**
 * Hook to check if user is in a specific workspace
 */
export function isInWorkspace(workspaceId: string): boolean {
  const { currentWorkspace } = useAppContextStore.getState()
  return currentWorkspace?.id === workspaceId
}

/**
 * Hook to check if user is in a specific tenant
 */
export function isInTenant(tenantId: string): boolean {
  const { currentTenant } = useAppContextStore.getState()
  return currentTenant?.id === tenantId
}
