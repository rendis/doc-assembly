import type { VariableDragData } from '../types/drag'
import { VARIABLE_ICONS, ROLE_PROPERTY_ICONS } from '../extensions/Mentions/variables'
import { GripVertical, Settings2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface VariableDragOverlayProps {
  data: VariableDragData
}

const OVERLAY_SOURCE_TYPE_STYLES: Record<'INTERNAL' | 'EXTERNAL' | 'default', string> = {
  INTERNAL: 'border-internal-border/60 bg-internal-muted/90 text-internal-foreground',
  EXTERNAL: 'border-external-border/60 bg-external-muted/90 text-external-foreground',
  default: 'border-border/80 bg-muted/90 text-foreground',
}

function getOverlaySourceTypeStyles(sourceType?: 'INTERNAL' | 'EXTERNAL'): string {
  return OVERLAY_SOURCE_TYPE_STYLES[sourceType ?? 'default']
}

/**
 * Ghost image shown while dragging a variable from the VariablesPanel
 * Displays the variable with icon, label, and visual feedback
 */
export function VariableDragOverlay({ data }: VariableDragOverlayProps) {
  // Choose icon based on variable type
  // For role variables, use property-specific icon; for regular variables, use type icon
  const Icon =
    data.itemType === 'role-variable' && data.propertyKey
      ? ROLE_PROPERTY_ICONS[data.propertyKey]
      : VARIABLE_ICONS[data.injectorType]

  // Check if variable has configurable format options
  const hasConfigurableOptions =
    data.metadata?.options && Object.keys(data.metadata.options).length > 0

  const isRole = data.itemType === 'role-variable'
  
  return (
    <div
      className={cn(
        'flex items-center gap-2 px-3 py-2 text-sm border rounded-md bg-card shadow-lg cursor-grabbing z-[100]',
        // Visual differentiation for role variables and source types
        isRole
          ? 'border-role-border/60 bg-role-muted/90 text-role-foreground'
          : getOverlaySourceTypeStyles(data.sourceType)
      )}
    >
      <GripVertical className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <Icon
        className={cn(
          'h-3.5 w-3.5 shrink-0',
          isRole ? 'text-role-foreground' : 'text-muted-foreground'
        )}
      />
      <span className="truncate font-medium">{data.label}</span>

      {/* Show gear icon if variable has configurable format options */}
      {hasConfigurableOptions && (
        <Settings2 className="h-3 w-3 text-muted-foreground shrink-0" />
      )}

      {/* Show type badge for regular variables */}
      {!isRole && (
        <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground/70 ml-auto">
          {data.injectorType}
        </span>
      )}
    </div>
  )
}
