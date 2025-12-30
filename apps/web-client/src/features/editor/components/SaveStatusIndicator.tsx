/**
 * Save Status Indicator
 *
 * Visual indicator for auto-save status with animations and retry functionality.
 */

import { Check, AlertCircle, Loader2, Cloud } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { AutoSaveStatus } from '../hooks/useAutoSave';

// =============================================================================
// Types
// =============================================================================

export interface SaveStatusIndicatorProps {
  status: AutoSaveStatus;
  lastSavedAt: Date | null;
  error: Error | null;
  onRetry?: () => void;
  className?: string;
}

// =============================================================================
// Helper Functions
// =============================================================================

function formatLastSaved(date: Date, t: (key: string) => string): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);

  if (diffSeconds < 5) {
    return t('editor.autoSave.justNow') || 'ahora mismo';
  }
  if (diffSeconds < 60) {
    return t('editor.autoSave.secondsAgo', { n: diffSeconds }) || `hace ${diffSeconds}s`;
  }
  if (diffMinutes < 60) {
    return t('editor.autoSave.minutesAgo', { n: diffMinutes }) || `hace ${diffMinutes}m`;
  }

  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// =============================================================================
// Animation Variants
// =============================================================================

// Text slides in from right, exits to right
const textVariants = {
  initial: { opacity: 0, x: 30, filter: 'blur(4px)' },
  animate: {
    opacity: 1,
    x: 0,
    filter: 'blur(0px)',
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] }
  },
  exit: {
    opacity: 0,
    x: 30,
    filter: 'blur(4px)',
    transition: { duration: 0.4, ease: [0.4, 0, 1, 1] }
  },
};

// Icon morph transition (used with layoutId)
const iconMorphTransition = {
  type: 'spring' as const,
  stiffness: 150,
  damping: 20,
  duration: 0.6,
};

// Icon appearance animation
const iconVariants = {
  initial: { scale: 0.5, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }
  },
  exit: {
    scale: 0.5,
    opacity: 0,
    transition: { duration: 0.25, ease: 'easeIn' }
  },
};

// =============================================================================
// Icon Component with Morph Effect
// =============================================================================

interface StatusIconProps {
  status: AutoSaveStatus;
}

function StatusIcon({ status }: StatusIconProps) {
  const iconMap = {
    idle: <Cloud className="h-4 w-4 text-muted-foreground" />,
    pending: <Cloud className="h-4 w-4 text-muted-foreground" />,
    saving: <Loader2 className="h-4 w-4 text-primary animate-spin" />,
    saved: <Check className="h-4 w-4 text-green-600 dark:text-green-500" />,
    error: <AlertCircle className="h-4 w-4 text-destructive" />,
  };

  return (
    <motion.div
      layoutId="save-status-icon"
      className="flex items-center justify-center w-5 h-5"
      transition={iconMorphTransition}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={status}
          variants={iconVariants}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          {iconMap[status]}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

// =============================================================================
// Component
// =============================================================================

export function SaveStatusIndicator({
  status,
  lastSavedAt,
  error,
  onRetry,
  className,
}: SaveStatusIndicatorProps) {
  const { t } = useTranslation();

  // Get text content and style based on status
  const getTextContent = () => {
    switch (status) {
      case 'idle':
        return lastSavedAt
          ? `${t('editor.autoSave.saved') || 'Guardado'} ${formatLastSaved(lastSavedAt, t)}`
          : null;
      case 'pending':
        return t('editor.autoSave.pending') || 'Sin guardar...';
      case 'saving':
        return t('editor.autoSave.saving') || 'Guardando...';
      case 'saved':
        return t('editor.autoSave.saved') || 'Guardado';
      case 'error':
        return t('editor.autoSave.error') || 'Error al guardar';
      default:
        return null;
    }
  };

  const getTextClass = () => {
    switch (status) {
      case 'idle':
      case 'pending':
        return 'text-muted-foreground';
      case 'saving':
        return 'text-primary';
      case 'saved':
        return 'text-green-600 dark:text-green-500';
      case 'error':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const textContent = getTextContent();

  return (
    <motion.div
      layout
      className={cn(
        'flex items-center gap-2 text-xs h-5 min-w-[120px] justify-end overflow-hidden',
        status === 'idle' && 'opacity-60',
        className
      )}
    >
      {/* Text with slide animation */}
      <AnimatePresence mode="wait">
        {textContent && (
          <motion.span
            key={`${status}-${textContent}`}
            className={cn('whitespace-nowrap', getTextClass())}
            variants={textVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            {textContent}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Icon with morph effect */}
      <StatusIcon status={status} />

      {/* Retry button for error state */}
      <AnimatePresence>
        {status === 'error' && onRetry && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-xs text-destructive hover:text-destructive"
              onClick={onRetry}
            >
              {t('common.retry') || 'Reintentar'}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
