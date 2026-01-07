import { create } from 'zustand'
import type { PageMargins, PageSize } from '../types'
import { PAGE_SIZES, DEFAULT_MARGINS } from '../types'

// =============================================================================
// Types
// =============================================================================

export interface PaginationState {
  pageSize: PageSize
  margins: PageMargins
  showPageNumbers: boolean
  pageGap: number
}

export interface PaginationActions {
  setPageSize: (size: PageSize) => void
  setMargins: (margins: PageMargins) => void
  setShowPageNumbers: (show: boolean) => void
  setPageGap: (gap: number) => void
  reset: () => void
}

export type PaginationStore = PaginationState & PaginationActions

// =============================================================================
// Initial State
// =============================================================================

const initialState: PaginationState = {
  pageSize: PAGE_SIZES.A4,
  margins: DEFAULT_MARGINS,
  showPageNumbers: true,
  pageGap: 50,
}

// =============================================================================
// Store
// =============================================================================

export const usePaginationStore = create<PaginationStore>()((set) => ({
  ...initialState,

  setPageSize: (pageSize) => set({ pageSize }),

  setMargins: (margins) => set({ margins }),

  setShowPageNumbers: (showPageNumbers) => set({ showPageNumbers }),

  setPageGap: (pageGap) => set({ pageGap }),

  reset: () => set(initialState),
}))

// =============================================================================
// Selectors
// =============================================================================

/**
 * Selector para obtener la configuración completa de paginación
 */
export const selectPaginationConfig = (state: PaginationStore) => ({
  pageSize: state.pageSize,
  margins: state.margins,
  showPageNumbers: state.showPageNumbers,
  pageGap: state.pageGap,
})

/**
 * Selector para obtener las dimensiones de página
 */
export const selectPageDimensions = (state: PaginationStore) => ({
  width: state.pageSize.width,
  height: state.pageSize.height,
})
