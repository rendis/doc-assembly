import { cn } from '@/lib/utils'
import type { VersionStatus } from '@/types/api'

interface VersionStatusBadgeProps {
  status: VersionStatus
}

const statusConfig: Record<
  VersionStatus,
  { label: string; badgeClass: string; dotClass: string }
> = {
  DRAFT: {
    label: 'Draft',
    badgeClass: 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-400',
    dotClass: 'bg-amber-500',
  },
  SCHEDULED: {
    label: 'Scheduled',
    badgeClass: 'border-blue-500/50 bg-blue-500/10 text-blue-600 dark:text-blue-400',
    dotClass: 'bg-blue-500',
  },
  PUBLISHED: {
    label: 'Published',
    badgeClass: 'border-green-500/50 bg-green-500/10 text-green-600 dark:text-green-400',
    dotClass: 'bg-green-500',
  },
  ARCHIVED: {
    label: 'Archived',
    badgeClass: 'border-muted-foreground/30 bg-muted text-muted-foreground',
    dotClass: 'bg-muted-foreground',
  },
}

export function VersionStatusBadge({ status }: VersionStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.DRAFT

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest',
        config.badgeClass
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dotClass)} />
      {config.label}
    </span>
  )
}
