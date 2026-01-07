import { useDraggable } from '@dnd-kit/core'
import { VARIABLE_ICONS, ROLE_PROPERTY_ICONS } from '../extensions/Mentions/variables'
import { GripVertical, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { VariableDragData } from '../types/drag'
import { hasConfigurableOptions } from '../types/injectable'

interface DraggableVariableProps {
  /**
   * Variable data to be dragged/clicked
   */
  data: VariableDragData

  /**
   * Optional click handler for click-to-insert functionality
   * If provided, clicking the variable will call this handler instead of initiating drag
   */
  onClick?: (data: VariableDragData) => void

  /**
   * Whether the variable is currently being dragged
   */
  isDragging?: boolean
}

/**
 * Draggable item for a single variable in the VariablesPanel
 * Supports both drag-and-drop and click-to-insert interactions
 *
 * Visual design:
 * - Icon based on variable type
 * - Gear icon for configurable format options
 * - Color differentiation for role variables (purple theme)
 * - Type badge for regular variables
 * - Hover and active states for better UX
 */
export function DraggableVariable({
  data,
  onClick,
  isDragging = false,
}: DraggableVariableProps) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: data.id,
    data: data,
  })

  // Choose icon based on variable type
  // For role variables, use property-specific icon; for regular variables, use type icon
  const Icon =
    data.itemType === 'role-variable' && data.propertyKey
      ? ROLE_PROPERTY_ICONS[data.propertyKey]
      : (VARIABLE_ICONS[data.injectorType] || VARIABLE_ICONS.TEXT)

  // Check if variable has configurable format options
  const hasOptions = hasConfigurableOptions(data.metadata)

  const isRole = data.itemType === 'role-variable'

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onClick?.(data)}
      className={cn(
        'flex items-center gap-2 px-3 py-2 text-sm border rounded-md bg-card shadow-sm cursor-grab hover:shadow-md transition-all group select-none',
        // Visual differentiation for role variables
        isRole
          ? 'border-role-border/50 bg-role-muted/30 hover:bg-role-muted/60 text-role-foreground'
          : 'border-border hover:bg-muted/50 hover:border-border/80',
        // Reduced opacity while dragging
        isDragging && 'opacity-30 cursor-grabbing'
      )}
    >
      {/* Drag handle */}
      <GripVertical
        className={cn(
          'h-3.5 w-3.5 shrink-0',
          isRole
            ? 'text-role-foreground/70 group-hover:text-role-foreground'
            : 'text-muted-foreground group-hover:text-foreground'
        )}
      />

      {/* Type icon */}
      <Icon
        className={cn(
          'h-3.5 w-3.5 shrink-0',
          isRole
            ? 'text-role-foreground'
            : 'text-muted-foreground group-hover:text-foreground'
        )}
      />

      {/* Variable label */}
      <span className="truncate font-medium flex-1">{data.label}</span>

      {/* Gear icon for configurable format options */}
      {hasOptions && (
        <Settings2
          className={cn(
            'h-3 w-3 shrink-0',
            isRole
              ? 'text-role-foreground/70'
              : 'text-muted-foreground/70 group-hover:text-foreground'
          )}
        />
      )}

      {/* Type badge for regular variables */}
      {!isRole && (
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70 whitespace-nowrap">
          {data.injectorType}
        </span>
      )}
    </div>
  )
}
