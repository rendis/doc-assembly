import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { SigningDocumentStatus } from '../types'

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  DRAFT: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  PENDING_PROVIDER: {
    label: 'Processing',
    className:
      'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  },
  PENDING: {
    label: 'Pending',
    className:
      'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    className: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  },
  COMPLETED: {
    label: 'Completed',
    className:
      'bg-green-500/10 text-green-600 dark:text-green-400',
  },
  DECLINED: {
    label: 'Declined',
    className: 'bg-red-500/10 text-red-600 dark:text-red-400',
  },
  VOIDED: {
    label: 'Voided',
    className: 'bg-muted text-muted-foreground',
  },
  EXPIRED: {
    label: 'Expired',
    className:
      'bg-orange-500/10 text-orange-600 dark:text-orange-400',
  },
  ERROR: {
    label: 'Error',
    className: 'bg-red-500/10 text-red-600 dark:text-red-400',
  },
}

interface SigningStatusBadgeProps {
  status: SigningDocumentStatus
  className?: string
}

export function SigningStatusBadge({
  status,
  className,
}: SigningStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    className: 'bg-muted text-muted-foreground',
  }

  return (
    <Badge
      className={cn(
        'border-transparent font-mono text-[10px] uppercase tracking-wider',
        config.className,
        className,
      )}
    >
      {config.label}
    </Badge>
  )
}
