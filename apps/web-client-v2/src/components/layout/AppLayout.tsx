import { Outlet } from '@tanstack/react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { AppSidebar } from './AppSidebar'
import { AppHeader } from './AppHeader'
import { useSidebarStore } from '@/stores/sidebar-store'

// Variantes de animación - sidebar aparece inmediatamente, las líneas y contenido se animan
const sidebarVariants = {
  initial: { opacity: 1 },
  animate: { opacity: 1 },
}

const contentVariants = {
  initial: { opacity: 0, scale: 0.95 },
  animate: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.35, ease: 'easeOut' as const, delay: 0.1 },
  },
}

const overlayVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

export function AppLayout() {
  const { isMobileOpen, toggleMobileOpen, closeMobile, isCollapsed } = useSidebarStore()

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Header completo con border */}
      <AppHeader variant="full" />

      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleMobileOpen}
        className="fixed right-4 top-4 z-50 lg:hidden"
      >
        {isMobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

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
      >
        <AppSidebar />
      </motion.div>

      {/* Contenido principal con scale+fade */}
      <motion.main
        variants={contentVariants}
        initial="initial"
        animate="animate"
        className={cn(
          'flex flex-1 flex-col overflow-hidden pt-16',
          !isCollapsed ? 'lg:pl-64' : 'lg:pl-16'
        )}
      >
        {/* Page content */}
        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </motion.main>
    </div>
  )
}
