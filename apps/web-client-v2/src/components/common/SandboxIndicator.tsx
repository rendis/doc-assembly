import { FlaskConical } from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useTranslation } from 'react-i18next'

interface SandboxIndicatorProps {
  variant?: 'badge' | 'label' | 'inline'
  className?: string
  showLabel?: boolean
}

/**
 * Visual indicator for sandbox mode
 *
 * Variants:
 * - badge: Compact badge with background (for headers, status bars)
 * - label: Text label with icon (for sidebar header)
 * - inline: Just the icon (for compact spaces)
 */
export function SandboxIndicator({
  variant = 'badge',
  className,
  showLabel = true,
}: SandboxIndicatorProps) {
  const { t } = useTranslation()

  if (variant === 'label') {
    return (
      <div
        className={cn(
          'flex items-center gap-1.5',
          'font-mono text-xs font-medium uppercase tracking-widest',
          'text-sandbox',
          className
        )}
      >
        <FlaskConical size={14} strokeWidth={1.5} />
        {showLabel && <span>{t('sandbox.label', 'Sandbox')}</span>}
      </div>
    )
  }

  if (variant === 'inline') {
    return (
      <span className={cn('inline-flex items-center gap-1 text-sandbox', className)}>
        <FlaskConical size={14} strokeWidth={1.5} />
      </span>
    )
  }

  // Default: badge variant
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.15 }}
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-1',
        'border border-sandbox-border bg-sandbox-muted',
        'font-mono text-xs font-semibold uppercase tracking-widest',
        'text-sandbox-foreground',
        className
      )}
    >
      <FlaskConical size={14} strokeWidth={2} />
      {showLabel && <span>{t('sandbox.label', 'Sandbox')}</span>}
    </motion.div>
  )
}
