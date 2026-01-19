import { create } from 'zustand'

/**
 * Version highlight state for promotion feedback
 * Tracks which version should be highlighted after promotion
 * Uses versionNumber instead of id because the id may differ between
 * the promote response and the fetched template versions
 */
export interface VersionHighlightState {
  highlightedTemplateId: string | null
  highlightedVersionNumber: number | null
  setHighlightedVersion: (templateId: string, versionNumber: number) => void
  clearHighlight: () => void
}

/**
 * Store for managing version highlight state
 * Used to provide visual feedback after promoting a version
 */
export const useVersionHighlightStore = create<VersionHighlightState>((set) => ({
  highlightedTemplateId: null,
  highlightedVersionNumber: null,

  setHighlightedVersion: (templateId, versionNumber) =>
    set({ highlightedTemplateId: templateId, highlightedVersionNumber: versionNumber }),

  clearHighlight: () =>
    set({ highlightedTemplateId: null, highlightedVersionNumber: null }),
}))
