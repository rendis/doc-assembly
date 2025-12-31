import { Search, ChevronDown, List, Grid } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TemplatesToolbarProps {
  viewMode: 'list' | 'grid'
  onViewModeChange: (mode: 'list' | 'grid') => void
  searchQuery: string
  onSearchChange: (query: string) => void
}

export function TemplatesToolbar({
  viewMode,
  onViewModeChange,
  searchQuery,
  onSearchChange,
}: TemplatesToolbarProps) {
  return (
    <div className="flex shrink-0 flex-col justify-between gap-6 border-b border-border bg-background px-8 py-6 md:flex-row md:items-center md:px-16">
      {/* Search */}
      <div className="group relative w-full md:max-w-md">
        <Search
          className="absolute left-0 top-1/2 -translate-y-1/2 text-muted-foreground/50 transition-colors group-focus-within:text-foreground"
          size={20}
        />
        <input
          type="text"
          placeholder="Search templates by name..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full rounded-none border-0 border-b border-border bg-transparent py-2 pl-8 pr-4 text-base font-light text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-foreground focus:ring-0"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-6">
        <div className="group relative">
          <button className="flex items-center gap-2 font-mono text-sm uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
            <span>Folder: All</span>
            <ChevronDown size={16} />
          </button>
        </div>
        <div className="group relative">
          <button className="flex items-center gap-2 font-mono text-sm uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground">
            <span>Status: Any</span>
            <ChevronDown size={16} />
          </button>
        </div>
        <div className="ml-2 flex items-center gap-2 border-l border-border pl-6">
          <button
            onClick={() => onViewModeChange('list')}
            className={cn(
              'transition-colors',
              viewMode === 'list' ? 'text-foreground' : 'text-muted-foreground/50 hover:text-muted-foreground'
            )}
          >
            <List size={20} />
          </button>
          <button
            onClick={() => onViewModeChange('grid')}
            className={cn(
              'transition-colors',
              viewMode === 'grid' ? 'text-foreground' : 'text-muted-foreground/50 hover:text-muted-foreground'
            )}
          >
            <Grid size={20} />
          </button>
        </div>
      </div>
    </div>
  )
}
