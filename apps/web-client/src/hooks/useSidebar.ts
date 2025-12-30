import type { SidebarType } from '@/stores/sidebar-store';
import { useSidebarStore } from '@/stores/sidebar-store';

/**
 * Options for the useSidebar hook
 */
export interface UseSidebarOptions {
  /**
   * The type of sidebar to manage ('app' or 'admin')
   */
  type: SidebarType;
}

/**
 * Return value from the useSidebar hook
 */
export interface UseSidebarReturn {
  /**
   * Whether the sidebar is currently expanded (pinned OR hovered)
   */
  isExpanded: boolean;

  /**
   * Whether the sidebar is pinned (permanently expanded)
   */
  isPinned: boolean;

  /**
   * Whether the sidebar is currently being hovered
   */
  isHovered: boolean;

  /**
   * Toggle the pinned state of the sidebar
   */
  togglePin: () => void;

  /**
   * Handler for mouse enter event
   * Expands the sidebar temporarily if not pinned
   */
  handleMouseEnter: () => void;

  /**
   * Handler for mouse leave event
   * Collapses the sidebar if not pinned
   */
  handleMouseLeave: () => void;
}

/**
 * Custom hook for managing sidebar state and behavior
 *
 * Features:
 * - Manages expanded/collapsed state
 * - Handles hover-to-expand behavior
 * - Manages pin/unpin functionality
 * - Integrates with persisted Zustand store
 *
 * @param options - Configuration options
 * @returns Sidebar state and handlers
 *
 * @example
 * ```tsx
 * const {
 *   isExpanded,
 *   isPinned,
 *   togglePin,
 *   handleMouseEnter,
 *   handleMouseLeave
 * } = useSidebar({ type: 'app' });
 *
 * return (
 *   <aside
 *     onMouseEnter={handleMouseEnter}
 *     onMouseLeave={handleMouseLeave}
 *     className={isExpanded ? 'w-64' : 'w-16'}
 *   >
 *     <button onClick={togglePin}>
 *       {isPinned ? 'Unpin' : 'Pin'}
 *     </button>
 *   </aside>
 * );
 * ```
 */
export function useSidebar(options: UseSidebarOptions): UseSidebarReturn {
  const { type } = options;

  // Get sidebar state from store
  const state = useSidebarStore((state) => state[type]);

  // Get actions from store based on sidebar type
  const togglePin = useSidebarStore((state) =>
    type === 'app' ? state.toggleAppPin : state.toggleAdminPin
  );

  const setHovered = useSidebarStore((state) =>
    type === 'app' ? state.setAppHovered : state.setAdminHovered
  );

  const isExpanded = useSidebarStore((state) =>
    type === 'app' ? state.isAppExpanded() : state.isAdminExpanded()
  );

  /**
   * Handle mouse enter event
   * Only expand if sidebar is not pinned
   */
  const handleMouseEnter = () => {
    if (!state.isPinned) {
      setHovered(true);
    }
  };

  /**
   * Handle mouse leave event
   * Only collapse if sidebar is not pinned
   */
  const handleMouseLeave = () => {
    if (!state.isPinned) {
      setHovered(false);
    }
  };

  return {
    isExpanded,
    isPinned: state.isPinned,
    isHovered: state.isHovered,
    togglePin,
    handleMouseEnter,
    handleMouseLeave,
  };
}
