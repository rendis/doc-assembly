import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PageFormat, PageMargins, PaginationConfig } from '../types/pagination';
import { PAGE_FORMATS, DEFAULT_PAGE_FORMAT } from '../utils/page-formats';

interface PaginationStore {
  config: PaginationConfig;
  setPaginationConfig: (config: Partial<PaginationConfig>) => void;
  setFormat: (format: PageFormat) => void;
  setCustomFormat: (width: number, height: number, margins: PageMargins) => void;
  togglePagination: (enabled: boolean) => void;
  setPageGap: (gap: number) => void;
  setShowPageNumbers: (show: boolean) => void;
}

export const usePaginationStore = create<PaginationStore>()(
  persist(
    (set) => ({
      config: {
        enabled: true,
        format: DEFAULT_PAGE_FORMAT,
        showPageNumbers: true,
        pageGap: 40,
      },

      setPaginationConfig: (config) =>
        set((state) => ({
          config: { ...state.config, ...config },
        })),

      setFormat: (format) =>
        set((state) => ({
          config: { ...state.config, format },
        })),

      setCustomFormat: (width, height, margins) =>
        set((state) => ({
          config: {
            ...state.config,
            format: {
              id: 'CUSTOM',
              name: 'Personalizado',
              width,
              height,
              margins,
            },
          },
        })),

      togglePagination: (enabled) =>
        set((state) => ({
          config: { ...state.config, enabled },
        })),

      setPageGap: (pageGap) =>
        set((state) => ({
          config: { ...state.config, pageGap },
        })),

      setShowPageNumbers: (showPageNumbers) =>
        set((state) => ({
          config: { ...state.config, showPageNumbers },
        })),
    }),
    {
      name: 'pagination-config',
    }
  )
);

// Re-export PAGE_FORMATS for convenience
export { PAGE_FORMATS };
