import { motion } from 'framer-motion'
import { Box } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/common/ThemeToggle'
import { LanguageSelector } from '@/components/common/LanguageSelector'

interface AppHeaderProps {
  variant?: 'minimal' | 'full'
  className?: string
}

export function AppHeader({ variant = 'minimal', className }: AppHeaderProps) {
  const isMinimal = variant === 'minimal'

  return (
    <motion.header
      className={cn(
        'fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between bg-background',
        isMinimal ? 'px-6 md:px-12 lg:px-32' : 'px-6',
        className
      )}
    >
      {/* Logo grande con layoutId para animación */}
      <motion.div
        layoutId="app-logo"
        className="flex items-center gap-3"
      >
        <motion.div
          layoutId="app-logo-icon"
          className="flex h-8 w-8 items-center justify-center border-2 border-foreground"
        >
          <Box size={16} fill="currentColor" className="text-foreground" />
        </motion.div>
        <motion.span
          layoutId="app-logo-text"
          className="font-display text-lg font-bold uppercase tracking-tight text-foreground"
        >
          Doc-Assembly
        </motion.span>
      </motion.div>

      {/* Controles de idioma y tema con layoutId para animación */}
      <motion.div
        layoutId="app-controls"
        className="flex items-center gap-1"
      >
        <LanguageSelector />
        <ThemeToggle />
      </motion.div>

      {/* Línea del borde - slide desde izquierda */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-px bg-border origin-left"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: isMinimal ? 0 : 1 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      />
    </motion.header>
  )
}
