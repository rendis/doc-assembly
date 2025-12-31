import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Tenant type
 */
export interface Tenant {
  id: string
  name: string
  code: string
  description?: string
  settings?: Record<string, unknown>
  createdAt: string
  updatedAt?: string
}

/**
 * Tenant with user role
 */
export interface TenantWithRole extends Tenant {
  role: string
  lastAccessedAt?: string | null
}

/**
 * Workspace type
 */
export type WorkspaceType = 'SYSTEM' | 'CLIENT'

/**
 * Workspace status
 */
export type WorkspaceStatus = 'ACTIVE' | 'SUSPENDED' | 'ARCHIVED'

/**
 * Workspace type
 */
export interface Workspace {
  id: string
  tenantId?: string
  name: string
  type: WorkspaceType
  status: WorkspaceStatus
  settings?: Record<string, unknown>
  createdAt: string
  updatedAt?: string
}

/**
 * Workspace with user role
 */
export interface WorkspaceWithRole extends Workspace {
  role: string
  lastAccessedAt?: string | null
}

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
