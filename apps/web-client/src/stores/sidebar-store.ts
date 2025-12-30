import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Sidebar type identifier
 */
export type SidebarType = 'app' | 'admin';

/**
 * State for a single sidebar instance
 */
interface SidebarSubState {
  isPinned: boolean;
  isHovered: boolean;
}

/**
 * Global sidebar state for both app and admin sidebars
 */
interface SidebarState {
  // App Sidebar State
  app: SidebarSubState;

  // Admin Sidebar State
  admin: SidebarSubState;

  // App Sidebar Actions
  setAppPinned: (pinned: boolean) => void;
  setAppHovered: (hovered: boolean) => void;
  toggleAppPin: () => void;

  // Admin Sidebar Actions
  setAdminPinned: (pinned: boolean) => void;
  setAdminHovered: (hovered: boolean) => void;
  toggleAdminPin: () => void;

  // Computed Helpers
  isAppExpanded: () => boolean;
  isAdminExpanded: () => boolean;
}

/**
 * Zustand store for sidebar state management with persistence
 *
 * Features:
 * - Separate state for app and admin sidebars
 * - Persists only isPinned state to localStorage
 * - Hover state is transient (not persisted)
 * - Provides computed helpers for expanded state
 */
export const useSidebarStore = create<SidebarState>()(
  persist(
    (set, get) => ({
      // Initial state - both sidebars start collapsed
      app: {
        isPinned: false,
        isHovered: false,
      },
      admin: {
        isPinned: false,
        isHovered: false,
      },

      // App Sidebar Actions
      setAppPinned: (pinned) =>
        set((state) => ({
          app: { ...state.app, isPinned: pinned },
        })),

      setAppHovered: (hovered) =>
        set((state) => ({
          app: { ...state.app, isHovered: hovered },
        })),

      toggleAppPin: () =>
        set((state) => ({
          app: { ...state.app, isPinned: !state.app.isPinned },
        })),

      // Admin Sidebar Actions
      setAdminPinned: (pinned) =>
        set((state) => ({
          admin: { ...state.admin, isPinned: pinned },
        })),

      setAdminHovered: (hovered) =>
        set((state) => ({
          admin: { ...state.admin, isHovered: hovered },
        })),

      toggleAdminPin: () =>
        set((state) => ({
          admin: { ...state.admin, isPinned: !state.admin.isPinned },
        })),

      // Computed Helpers
      isAppExpanded: () => {
        const { app } = get();
        return app.isPinned || app.isHovered;
      },

      isAdminExpanded: () => {
        const { admin } = get();
        return admin.isPinned || admin.isHovered;
      },
    }),
    {
      name: 'sidebar-storage',
      // Only persist isPinned state, not hover state
      partialize: (state) => ({
        app: { isPinned: state.app.isPinned, isHovered: false },
        admin: { isPinned: state.admin.isPinned, isHovered: false },
      }),
    }
  )
);
