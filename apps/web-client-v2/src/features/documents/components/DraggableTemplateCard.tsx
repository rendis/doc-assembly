import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import type { TemplateListItem } from '@/types/api'

interface DraggableTemplateCardProps {
  template: TemplateListItem
  children: React.ReactNode
  disabled?: boolean
}

export function DraggableTemplateCard({
  template,
  children,
  disabled = false,
}: DraggableTemplateCardProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `template-${template.id}`,
      data: {
        type: 'template',
        template,
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
