import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Sidebar store state
 */
interface SidebarState {
  // State
  isCollapsed: boolean
  isMobileOpen: boolean
  isPinned: boolean
  isHovering: boolean

  // Actions
  toggleCollapsed: () => void
  setCollapsed: (collapsed: boolean) => void
  toggleMobileOpen: () => void
  setMobileOpen: (open: boolean) => void
  closeMobile: () => void
  togglePinned: () => void
  setPinned: (pinned: boolean) => void
  setHovering: (hovering: boolean) => void
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
      isPinned: true,
      isHovering: false,

      // Actions
      toggleCollapsed: () => set({ isCollapsed: !get().isCollapsed }),

      setCollapsed: (collapsed) => set({ isCollapsed: collapsed }),

      toggleMobileOpen: () => set({ isMobileOpen: !get().isMobileOpen }),

      setMobileOpen: (open) => set({ isMobileOpen: open }),

      closeMobile: () => set({ isMobileOpen: false }),

      togglePinned: () => {
        const newPinned = !get().isPinned
        set({ isPinned: newPinned, isHovering: false })
      },

      setPinned: (pinned) => set({ isPinned: pinned, isHovering: false }),

      setHovering: (hovering) => set({ isHovering: hovering }),
    }),
    {
      name: 'doc-assembly-sidebar',
      partialize: (state) => ({
        isCollapsed: state.isCollapsed,
        isPinned: state.isPinned,
      }),
    }
  )
)
