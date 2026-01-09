import { create } from 'zustand'

/**
 * Version highlight state for promotion feedback
 * Tracks which version should be highlighted after promotion
 */
export interface VersionHighlightState {
  highlightedVersionId: string | null
  setHighlightedVersionId: (id: string | null) => void
  clearHighlight: () => void
}

/**
 * Store for managing version highlight state
 * Used to provide visual feedback after promoting a version
 */
export const useVersionHighlightStore = create<VersionHighlightState>((set) => ({
  highlightedVersionId: null,

  setHighlightedVersionId: (id) => set({ highlightedVersionId: id }),

  clearHighlight: () => set({ highlightedVersionId: null }),
}))
