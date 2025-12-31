import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Sidebar store state
 */
interface SidebarState {
  // State
  isCollapsed: boolean
  isMobileOpen: boolean

  // Actions
  toggleCollapsed: () => void
  setCollapsed: (collapsed: boolean) => void
  toggleMobileOpen: () => void
  setMobileOpen: (open: boolean) => void
  closeMobile: () => void
}

/**
 * Sidebar store with persistence
 */
export const useSidebarStore = create<SidebarState>()(
  persist(
    (set, get) => ({
      // Initial state
      isCollapsed: false,
      isMobileOpen: false,

      // Actions
      toggleCollapsed: () => set({ isCollapsed: !get().isCollapsed }),

      setCollapsed: (collapsed) => set({ isCollapsed: collapsed }),

      toggleMobileOpen: () => set({ isMobileOpen: !get().isMobileOpen }),

      setMobileOpen: (open) => set({ isMobileOpen: open }),

      closeMobile: () => set({ isMobileOpen: false }),
    }),
    {
      name: 'doc-assembly-sidebar',
      partialize: (state) => ({
        isCollapsed: state.isCollapsed,
      }),
    }
  )
)
