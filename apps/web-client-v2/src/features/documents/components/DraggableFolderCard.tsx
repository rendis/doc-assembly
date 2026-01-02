import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import type { Folder } from '@/types/api'

interface DraggableFolderCardProps {
  folder: Folder
  children: React.ReactNode
  disabled?: boolean
}

export function DraggableFolderCard({
  folder,
  children,
  disabled = false,
}: DraggableFolderCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `folder-${folder.id}`,
      data: {
        type: 'folder',
        folder,
      },
      disabled,
    })

  const style = {
    transform: CSS.Translate.toString(transform),
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn('touch-none', isDragging && 'z-50 opacity-50')}
      {...listeners}
      {...attributes}
    >
      {children}
    </div>
  )
}
