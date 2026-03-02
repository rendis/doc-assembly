import { ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import type { WorkspaceWithRole } from '../types'

interface WorkspaceCardProps {
  workspace: WorkspaceWithRole
  onClick: () => void
  lastAccessed?: string
  userCount?: number
}

export function WorkspaceCard({
  workspace,
  onClick,
  lastAccessed,
  userCount,
}: WorkspaceCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex w-full items-center justify-between',
        'rounded-sm border border-transparent border-b-border px-4 py-6',
        'outline-none transition-all duration-200',
        'hover:z-10 hover:border-foreground hover:bg-accent',
        '-mb-px'
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <h3
              className={cn(
                'max-w-[300px] truncate text-left font-display text-xl font-medium tracking-tight text-foreground md:max-w-[400px] md:text-2xl',
                'transition-transform duration-300 group-hover:translate-x-2'
              )}
            >
              {workspace.name}
            </h3>
          </TooltipTrigger>
          <TooltipContent>{workspace.name}</TooltipContent>
        </Tooltip>
        <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest text-muted-foreground">
          {workspace.code}
        </span>
      </div>
      <div className="flex items-center gap-6 md:gap-8">
        {lastAccessed && (
          <span className="whitespace-nowrap font-mono text-[10px] text-muted-foreground transition-colors group-hover:text-foreground md:text-xs">
            Last accessed: {lastAccessed}
          </span>
        )}
        {userCount !== undefined && (
          <span className="hidden whitespace-nowrap font-mono text-[10px] text-muted-foreground md:inline md:text-xs">
            {userCount} users
          </span>
        )}
        <ArrowRight
          className="text-muted-foreground transition-all duration-300 group-hover:translate-x-1 group-hover:text-foreground"
          size={24}
        />
      </div>
    </button>
  )
}
