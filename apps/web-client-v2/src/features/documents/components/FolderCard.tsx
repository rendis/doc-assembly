import { Folder, MoreVertical } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FolderCardProps {
  name: string
  itemCount: number
  onClick?: () => void
}

export function FolderCard({ name, itemCount, onClick }: FolderCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'group relative flex cursor-pointer flex-col gap-8 border border-border bg-background p-6 transition-colors hover:border-foreground'
      )}
    >
      <div className="flex items-start justify-between">
        <Folder
          className="text-muted-foreground transition-colors group-hover:text-foreground"
          size={32}
          strokeWidth={1}
        />
        <button
          className="text-muted-foreground hover:text-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical size={20} />
        </button>
      </div>
      <div>
        <h3 className="mb-1 font-display text-lg font-medium text-foreground decoration-1 underline-offset-4 group-hover:underline">
          {name}
        </h3>
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {itemCount} items
        </p>
      </div>
    </div>
  )
}
