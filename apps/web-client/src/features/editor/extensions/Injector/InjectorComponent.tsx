import { useState, useRef, useCallback, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { NodeViewWrapper } from '@tiptap/react'
// @ts-expect-error - NodeViewProps is not exported in type definitions
import type { NodeViewProps } from '@tiptap/react'
import { NodeSelection } from '@tiptap/pm/state'
import { cn } from '@/lib/utils'
import {
  Calendar,
  CheckSquare,
  Coins,
  Hash,
  Image as ImageIcon,
  Settings2,
  Table,
  Type,
  User,
  Mail,
  AlertTriangle,
} from 'lucide-react'
import { EditorNodeContextMenu } from '../../components/EditorNodeContextMenu'
import { InjectorConfigDialog } from '../../components/InjectorConfigDialog'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import type { RolePropertyKey } from '../../types/role-injectable'
import { ROLE_PROPERTIES } from '../../types/role-injectable'
import { useSignerRolesStore } from '../../stores/signer-roles-store'
import { useInjectablesStore } from '../../stores/injectables-store'
import type { InjectorType } from '../../types/variables'

const icons = {
  TEXT: Type,
  NUMBER: Hash,
  DATE: Calendar,
  CURRENCY: Coins,
  BOOLEAN: CheckSquare,
  IMAGE: ImageIcon,
  TABLE: Table,
  ROLE_TEXT: User,
}

// Iconos específicos para propiedades de rol
const rolePropertyIcons: Record<RolePropertyKey, typeof User> = {
  name: User,
  email: Mail,
}

// Scalar types that support label configuration and resize
const SCALAR_TYPES: InjectorType[] = ['TEXT', 'NUMBER', 'DATE', 'CURRENCY', 'BOOLEAN']

const MIN_WIDTH = 40

export const InjectorComponent = (props: NodeViewProps) => {
  const { node, selected, deleteNode, updateAttributes, editor, getPos } = props
  const {
    label, type, format, variableId,
    prefix, suffix, showLabelIfEmpty, defaultValue, width,
    isRoleVariable, propertyKey, roleId,
  } = node.attrs

  const { t } = useTranslation()
  const chipRef = useRef<HTMLSpanElement>(null)
  const [isResizing, setIsResizing] = useState(false)
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
  } | null>(null)
  const [configDialogOpen, setConfigDialogOpen] = useState(false)
  const [, forceUpdate] = useState({})

  useEffect(() => {
    const handleSelectionUpdate = () => forceUpdate({})
    editor.on('selectionUpdate', handleSelectionUpdate)
    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate)
    }
  }, [editor])

  const isDirectlySelected = useMemo(() => {
    if (!selected) return false
    const { selection } = editor.state
    const pos = getPos()
    return (
      selection instanceof NodeSelection &&
      typeof pos === 'number' &&
      selection.anchor === pos
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected, editor.state.selection, getPos])

  const isEditorEditable = editor.isEditable

  // Obtener el rol actual del store para actualización dinámica
  const roles = useSignerRolesStore((state) => state.roles)

  // Look up current label from injectables store
  const currentLabel = useInjectablesStore(
    (s) => s.variables.find((v) => v.variableId === variableId)?.label
  )

  // Resolver el label dinámicamente para role injectables
  const { displayLabel, roleExists } = useMemo(() => {
    if (!isRoleVariable || !roleId) {
      return { displayLabel: currentLabel || label || 'Variable', roleExists: true }
    }

    const currentRole = roles.find((r) => r.id === roleId)
    if (!currentRole) {
      return { displayLabel: label || 'Rol eliminado', roleExists: false }
    }

    const propDef = ROLE_PROPERTIES.find((p) => p.key === propertyKey)
    const propLabel = propDef ? t(propDef.labelKey) : propertyKey || ''

    return {
      displayLabel: `${currentRole.label}.${propLabel}`,
      roleExists: true,
    }
  }, [isRoleVariable, roleId, roles, label, currentLabel, propertyKey, t])

  // Display variableId code in chip, full label as tooltip
  const displayCode = variableId || 'variable'

  // Seleccionar icono basado en si es role variable y si existe
  const Icon = useMemo(() => {
    if (isRoleVariable && !roleExists) return AlertTriangle
    if (isRoleVariable && propertyKey) {
      return rolePropertyIcons[propertyKey as RolePropertyKey] || User
    }
    return icons[type as keyof typeof icons] || Type
  }, [isRoleVariable, roleExists, propertyKey, type])

  const supportsLabelConfig = !isRoleVariable && SCALAR_TYPES.includes(type as InjectorType)
  const isInvalid = isRoleVariable && !roleExists

  // Measure natural (auto) content width by temporarily removing explicit width
  const getNaturalWidth = useCallback(() => {
    const chip = chipRef.current
    if (!chip) return 200
    const prev = chip.style.width
    chip.style.width = ''
    const natural = chip.getBoundingClientRect().width
    chip.style.width = prev
    return natural
  }, [])

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const handleConfigureLabel = () => {
    setConfigDialogOpen(true)
  }

  const handleApplyConfig = (config: {
    prefix?: string | null
    suffix?: string | null
    showLabelIfEmpty?: boolean
    defaultValue?: string | null
  }) => {
    updateAttributes(config)
  }

  const handleClearWidth = useCallback(() => {
    updateAttributes({ width: null })
    if (chipRef.current) {
      chipRef.current.style.width = ''
    }
  }, [updateAttributes])

  // Custom drag-to-resize from the right edge
  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()

      const chip = chipRef.current
      if (!chip) return

      const startX = e.clientX
      const startWidth = chip.getBoundingClientRect().width
      const naturalWidth = getNaturalWidth()
      let currentWidth = startWidth

      setIsResizing(true)

      const onPointerMove = (ev: PointerEvent) => {
        const delta = ev.clientX - startX
        currentWidth = Math.max(MIN_WIDTH, Math.min(startWidth + delta, naturalWidth))
        chip.style.width = `${currentWidth}px`
      }

      const onPointerUp = () => {
        document.removeEventListener('pointermove', onPointerMove)
        document.removeEventListener('pointerup', onPointerUp)

        const finalWidth = Math.round(currentWidth)
        updateAttributes({ width: finalWidth >= MIN_WIDTH ? finalWidth : null })
        setIsResizing(false)
      }

      document.addEventListener('pointermove', onPointerMove)
      document.addEventListener('pointerup', onPointerUp)
    },
    [getNaturalWidth, updateAttributes]
  )

  useEffect(() => {
    if (chipRef.current && width) {
      chipRef.current.style.width = `${width}px`
    }
  }, [width])

  const showResizeHandle = isEditorEditable && supportsLabelConfig && (isDirectlySelected || isResizing)

  return (
    <NodeViewWrapper as="span" className="mx-1" style={{ position: 'relative', display: 'inline' }}>
      <span
        ref={chipRef}
        contentEditable={false}
        onContextMenu={handleContextMenu}
        data-invalid={isInvalid ? 'true' : undefined}
        className={cn(
          'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-sm font-medium transition-all duration-200 ease-out select-none',
          // Ring de selección
          selected && isInvalid
            ? 'ring-2 ring-destructive ring-offset-2 ring-offset-background'
            : selected
              ? 'ring-2 ring-ring'
              : '',
          // Estado de warning: rol eliminado
          isInvalid
            ? [
                'bg-destructive/25 dark:bg-destructive/35',
                'text-destructive',
                'border-2 border-dashed border-destructive',
                'hover:bg-destructive/35 dark:hover:bg-destructive/45',
              ]
            : isRoleVariable
              ? [
                  'border',
                  'bg-role-muted text-role-foreground hover:bg-role-muted/80 border-role-border/50',
                  'dark:bg-role-muted dark:text-role-foreground dark:hover:bg-role-muted/80 dark:border-dashed dark:border-role-border',
                ]
              : [
                  'border',
                  'bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-200 hover:border-gray-300',
                  'dark:bg-info-muted dark:text-info-foreground dark:hover:bg-info-muted/80 dark:border-dashed dark:border-info-border',
                ]
        )}
        style={{
          width: width ? `${width}px` : undefined,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {prefix && (
          <span className="text-[10px] opacity-70 font-normal">
            {prefix}
          </span>
        )}
        <Icon
          className={cn(
            'h-3 w-3 flex-shrink-0',
            isInvalid && 'animate-error-pulse'
          )}
        />
        {isInvalid ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-default truncate">{displayLabel}</span>
            </TooltipTrigger>
            <TooltipContent
              side="top"
              className="bg-destructive text-destructive-foreground border-destructive"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                <span>{t('editor.injectable.errors.roleDeleted')}</span>
              </div>
            </TooltipContent>
          </Tooltip>
        ) : isRoleVariable ? (
          <span className="cursor-default truncate">{displayLabel}</span>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="cursor-default truncate">{displayCode}</span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              {displayLabel}
            </TooltipContent>
          </Tooltip>
        )}
        {suffix && (
          <span className="text-[10px] opacity-70 font-normal">
            {suffix}
          </span>
        )}
        {format && (
          <span className="text-[10px] opacity-70 bg-background/50 px-1 rounded font-mono">
            {format}
          </span>
        )}
        {(showLabelIfEmpty || defaultValue) && (
          <Settings2 className="h-2.5 w-2.5 opacity-50 flex-shrink-0" />
        )}
      </span>

      {showResizeHandle && (
        <span
          onPointerDown={handleResizePointerDown}
          className="absolute top-0 -right-1 w-2 h-full cursor-ew-resize z-10 flex items-center justify-center"
          contentEditable={false}
        >
          <span className="w-0.5 h-3/4 rounded-full bg-primary/60" />
        </span>
      )}

      {contextMenu && (
        <EditorNodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeType="injector"
          onDelete={deleteNode}
          onConfigureLabel={supportsLabelConfig ? handleConfigureLabel : undefined}
          onClearWidth={width ? handleClearWidth : undefined}
          onClose={() => setContextMenu(null)}
        />
      )}

      {supportsLabelConfig && (
        <InjectorConfigDialog
          open={configDialogOpen}
          onOpenChange={setConfigDialogOpen}
          injectorType={type as InjectorType}
          variableId={variableId}
          variableLabel={displayLabel}
          currentConfig={{
            prefix,
            suffix,
            showLabelIfEmpty,
            defaultValue,
            format,
          }}
          onApply={handleApplyConfig}
        />
      )}
    </NodeViewWrapper>
  )
}
