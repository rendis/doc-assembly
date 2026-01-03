import { Fragment } from 'react'
import { useDroppable } from '@dnd-kit/core'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  id: string | null // null = root
  label: string
  isActive?: boolean
}

interface DroppableBreadcrumbProps {
  items: BreadcrumbItem[]
  onNavigate: (folderId: string | null) => void
}

export function DroppableBreadcrumb({
  items,
  onNavigate,
}: DroppableBreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2 py-6 font-mono text-sm text-muted-foreground">
      {items.map((item, i) => (
        <Fragment key={item.id ?? 'root'}>
          {i > 0 && (
            <ChevronRight size={14} className="text-muted-foreground/50" />
          )}
          <DroppableBreadcrumbItem
            id={item.id}
            label={item.label}
            isActive={item.isActive}
            onNavigate={onNavigate}
          />
        </Fragment>
      ))}
    </nav>
  )
}

interface DroppableBreadcrumbItemProps {
  id: string | null
  label: string
  isActive?: boolean
  onNavigate: (id: string | null) => void
}

function DroppableBreadcrumbItem({
  id,
  label,
  isActive,
  onNavigate,
}: DroppableBreadcrumbItemProps) {
  const { setNodeRef, isOver, active } = useDroppable({
    id: `breadcrumb-${id ?? 'root'}`,
    data: {
      type: 'breadcrumb',
      folderId: id,
    },
  })

  // Check what type is being dragged
  const isDraggingFolder = active?.data.current?.type === 'folder'
  const isDraggingTemplate = active?.data.current?.type === 'template'

  // Get current parent/folder of dragged item
  const draggedFolderParentId = active?.data.current?.folder?.parentId
  const draggedTemplateFolderId = active?.data.current?.template?.folderId

  // Folder valid: not dropping in same parent, not on active breadcrumb
  const isValidFolderDrop =
    isDraggingFolder && draggedFolderParentId !== id && !isActive

  // Template valid: not dropping in same folder, not on active breadcrumb
  const isValidTemplateDrop =
    isDraggingTemplate && draggedTemplateFolderId !== id && !isActive

  const isValidDrop = isValidFolderDrop || isValidTemplateDrop

  if (isActive) {
    return (
      <span
        ref={setNodeRef}
        className="border-b border-foreground font-medium text-foreground"
      >
        {label}
      </span>
    )
  }

  return (
    <button
      ref={setNodeRef}
      onClick={() => onNavigate(id)}
      className={cn(
        'cursor-pointer border-none bg-transparent px-2 py-1 transition-all hover:text-foreground',
        isOver &&
          isValidDrop &&
          'rounded bg-primary/10 text-primary ring-2 ring-primary'
      )}
    >
      {label}
    </button>
  )
}
