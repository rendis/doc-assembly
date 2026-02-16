import { useCallback, useSyncExternalStore } from 'react'

/**
 * Hook to detect if a media query matches
 * @param query - CSS media query string
 * @returns boolean indicating if the query matches
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      const mediaQuery = window.matchMedia(query)
      mediaQuery.addEventListener('change', callback)
      return () => mediaQuery.removeEventListener('change', callback)
    },
    [query]
  )

  const getSnapshot = useCallback(() => {
    return window.matchMedia(query).matches
  }, [query])

  const getServerSnapshot = useCallback(() => false, [])

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

// Tailwind breakpoints
const BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const

/**
 * Convenience hook for mobile detection (< lg breakpoint)
 * @returns boolean - true if viewport is less than lg (1024px)
 */
export function useIsMobile(): boolean {
  return !useMediaQuery(`(min-width: ${BREAKPOINTS.lg})`)
}

/**
 * Convenience hook for tablet detection (>= md and < lg)
 */
export function useIsTablet(): boolean {
  const isAboveMd = useMediaQuery(`(min-width: ${BREAKPOINTS.md})`)
  const isBelowLg = !useMediaQuery(`(min-width: ${BREAKPOINTS.lg})`)
  return isAboveMd && isBelowLg
}

/**
 * Convenience hook for desktop detection (>= lg)
 */
export function useIsDesktop(): boolean {
  return useMediaQuery(`(min-width: ${BREAKPOINTS.lg})`)
}
