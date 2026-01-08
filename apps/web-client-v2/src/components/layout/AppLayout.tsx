import { Outlet } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { useCallback, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import { AppSidebar } from './AppSidebar'
import { AppHeader } from './AppHeader'
import { useSidebarStore } from '@/stores/sidebar-store'

// Variantes de animación - sidebar aparece inmediatamente
const sidebarVariants = {
  initial: { opacity: 1 },
  animate: { opacity: 1 },
}

const overlayVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

export function AppLayout() {
  const { isMobileOpen, toggleMobileOpen, closeMobile, isPinned, setHovering } =
    useSidebarStore()
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleMouseEnter = useCallback(() => {
    if (isPinned) return

    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }

    setHovering(true)
  }, [isPinned, setHovering])

  const handleMouseLeave = useCallback(() => {
    if (isPinned) return

    hoverTimeoutRef.current = setTimeout(() => {
      setHovering(false)
    }, 150)
  }, [isPinned, setHovering])

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Header completo con border y botón de menú móvil integrado */}
      <AppHeader
        variant="full"
        showMobileMenu={true}
        isMobileMenuOpen={isMobileOpen}
        onMobileMenuToggle={toggleMobileOpen}
      />

      {/* Mobile overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            variants={overlayVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={closeMobile}
          />
        )}
      </AnimatePresence>

      {/* Sidebar con animación de entrada */}
      <motion.div
        variants={sidebarVariants}
        initial="initial"
        animate="animate"
        className={cn(
          'fixed inset-y-0 left-0 z-40 pt-16 lg:relative lg:pt-0',
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <AppSidebar />
      </motion.div>

      {/* Contenido principal */}
      <main className="flex flex-1 flex-col overflow-hidden pt-16">
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
