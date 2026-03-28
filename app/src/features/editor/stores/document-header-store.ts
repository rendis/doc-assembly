import { create } from 'zustand'
import { deriveHeaderEnabled, normalizeHeaderContent } from '../utils/document-header'

// =============================================================================
// Types
// =============================================================================

export type DocumentHeaderLayout = 'image-left' | 'image-right' | 'image-center'

export interface DocumentHeaderState {
  enabled: boolean
  layout: DocumentHeaderLayout
  imageUrl: string | null
  imageAlt: string
  imageWidth: number | null
  imageHeight: number | null
  content: Record<string, unknown> | null
}

export interface DocumentHeaderActions {
  setLayout: (layout: DocumentHeaderLayout) => void
  setImage: (url: string, alt: string) => void
  setImageDimensions: (width: number | null, height: number | null) => void
  setContent: (content: Record<string, unknown> | null) => void
  reset: () => void
  configure: (partial: Partial<DocumentHeaderState>) => void
}

export type DocumentHeaderStore = DocumentHeaderState & DocumentHeaderActions

// =============================================================================
// Initial State
// =============================================================================

const initialState: DocumentHeaderState = {
  enabled: false,
  layout: 'image-left',
  imageUrl: null,
  imageAlt: '',
  imageWidth: null,
  imageHeight: null,
  content: null,
}

// =============================================================================
// Store
// =============================================================================

export const useDocumentHeaderStore = create<DocumentHeaderStore>()((set) => ({
  ...initialState,

  setLayout: (layout) => set({ layout }),

  setImage: (imageUrl, imageAlt) =>
    set((state) => ({
      imageUrl: imageUrl || null,
      imageAlt,
      imageWidth: imageUrl && imageUrl === state.imageUrl ? state.imageWidth : null,
      imageHeight: imageUrl && imageUrl === state.imageUrl ? state.imageHeight : null,
      enabled: deriveHeaderEnabled({
        imageUrl,
        content: state.content,
      }),
    })),

  setImageDimensions: (imageWidth, imageHeight) =>
    set({
      imageWidth,
      imageHeight,
    }),

  setContent: (content) =>
    set((state) => {
      const normalizedContent = normalizeHeaderContent(content)
      return {
        content: normalizedContent,
      enabled: deriveHeaderEnabled({
        imageUrl: state.imageUrl,
        content: normalizedContent,
      }),
      }
    }),

  reset: () => set(initialState),

  configure: (partial) =>
    set((state) => {
      const nextState = {
        ...state,
        ...partial,
        content: partial.content !== undefined ? normalizeHeaderContent(partial.content) : state.content,
      }
      return {
        ...nextState,
        enabled: deriveHeaderEnabled(nextState),
      }
    }),
}))
