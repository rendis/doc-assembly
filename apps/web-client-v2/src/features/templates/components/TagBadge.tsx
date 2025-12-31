import { cn } from '@/lib/utils'

interface TagBadgeProps {
  tag: string
  className?: string
}

export function TagBadge({ tag, className }: TagBadgeProps) {
  return (
    <span
      className={cn(
        'rounded-sm bg-muted px-1 font-mono text-xs text-muted-foreground',
        className
      )}
    >
      {tag}
    </span>
  )
}
