import { create } from 'zustand'
import { persist, subscribeWithSelector } from 'zustand/middleware'
import { useAppContextStore } from '@/stores/app-context-store'

/**
 * Sandbox mode state - scoped per workspace
 */
export interface SandboxModeState {
  // State - maps workspaceId to sandbox enabled status
  sandboxWorkspaces: Record<string, boolean>

  // Actions
  enableSandbox: (workspaceId: string) => void
  disableSandbox: (workspaceId: string) => void
  toggleSandbox: (workspaceId: string) => void
  clearSandboxForWorkspace: (workspaceId: string) => void

  // Computed
  isSandboxActive: () => boolean
  isSandboxActiveForWorkspace: (workspaceId: string) => boolean
}

/**
 * Sandbox mode store with persistence
 *
 * Sandbox mode allows users to work with templates and documents
 * in an isolated environment without affecting production data.
 */
export const useSandboxModeStore = create<SandboxModeState>()(
  persist(
    subscribeWithSelector((set, get) => ({
      sandboxWorkspaces: {},

      enableSandbox: (workspaceId) =>
        set((state) => ({
          sandboxWorkspaces: { ...state.sandboxWorkspaces, [workspaceId]: true },
        })),

      disableSandbox: (workspaceId) =>
        set((state) => ({
          sandboxWorkspaces: { ...state.sandboxWorkspaces, [workspaceId]: false },
        })),

      toggleSandbox: (workspaceId) =>
        set((state) => ({
          sandboxWorkspaces: {
            ...state.sandboxWorkspaces,
            [workspaceId]: !state.sandboxWorkspaces[workspaceId],
          },
        })),

      clearSandboxForWorkspace: (workspaceId) =>
        set((state) => {
          const { [workspaceId]: _, ...rest } = state.sandboxWorkspaces
          return { sandboxWorkspaces: rest }
        }),

      isSandboxActive: () => {
        const { currentWorkspace } = useAppContextStore.getState()
        if (!currentWorkspace?.id) return false
        return get().sandboxWorkspaces[currentWorkspace.id] ?? false
      },

      isSandboxActiveForWorkspace: (workspaceId) => {
        return get().sandboxWorkspaces[workspaceId] ?? false
      },
    })),
    {
      name: 'doc-assembly-sandbox',
      partialize: (state) => ({ sandboxWorkspaces: state.sandboxWorkspaces }),
    }
  )
)

/**
 * Convenience hook for sandbox mode in current workspace
 */
export function useSandboxMode() {
  const { currentWorkspace } = useAppContextStore()
  const {
    sandboxWorkspaces,
    enableSandbox,
    disableSandbox,
    toggleSandbox,
  } = useSandboxModeStore()

  const workspaceId = currentWorkspace?.id ?? ''
  const isSandboxSupported = currentWorkspace?.type === 'CLIENT'
  const isSandboxActive = isSandboxSupported ? (sandboxWorkspaces[workspaceId] ?? false) : false

  return {
    isSandboxActive,
    enableSandbox: () => workspaceId && isSandboxSupported && enableSandbox(workspaceId),
    disableSandbox: () => workspaceId && disableSandbox(workspaceId),
    toggleSandbox: () => workspaceId && isSandboxSupported && toggleSandbox(workspaceId),
  }
}

/**
 * Check if sandbox mode is active for current workspace (non-hook version)
 */
export function isSandboxModeActive(): boolean {
  const { currentWorkspace } = useAppContextStore.getState()
  if (!currentWorkspace?.id) return false
  if (currentWorkspace.type !== 'CLIENT') return false
  return useSandboxModeStore.getState().sandboxWorkspaces[currentWorkspace.id] ?? false
}
