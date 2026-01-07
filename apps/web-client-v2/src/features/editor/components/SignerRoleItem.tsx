import { useState, useCallback, useRef, useEffect } from 'react'
import { GripVertical, Type, Variable, AlertTriangle, ChevronDown, Check } from 'lucide-react'
import { Trash2 } from '@/components/animate-ui/icons/trash-2'
import { AnimateIcon } from '@/components/animate-ui/icons/icon'
import { motion, AnimatePresence } from 'framer-motion'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { useSignerRolesStore } from '../stores/signer-roles-store'
import { NotificationBadge, NotificationConfigDialog } from './workflow'
import type {
  SignerRoleDefinition,
  SignerRoleFieldValue,
  NotificationTriggerMap,
} from '../types/signer-roles'
import { getDefaultParallelTriggers, getDefaultSequentialTriggers } from '../types/signer-roles'
import type { Variable as VariableType } from '../types/variables'

interface SignerRoleItemProps {
  role: SignerRoleDefinition
  index: number
  isCompactMode: boolean
  isDragging?: boolean
  isOverlay?: boolean
  variables: VariableType[]
  allRoles: SignerRoleDefinition[]
  // Selection mode
  isSelectionMode: boolean
  isSelected: boolean
  onToggleSelection: (id: string) => void
  onUpdate: (
    id: string,
    updates: Partial<Omit<SignerRoleDefinition, 'id'>>
  ) => void
  onDelete: (id: string) => void
}

interface FieldEditorProps {
  label: string
  field: SignerRoleFieldValue
  variables: VariableType[]
  disabled?: boolean
  onChange: (value: SignerRoleFieldValue) => void
}

function FieldEditor({ label, field, variables, disabled, onChange }: FieldEditorProps) {
  const isText = field.type === 'text'
  const textVariables = variables.filter((v) => v.type === 'TEXT')

  const handleTypeToggle = () => {
    if (disabled) return
    onChange({
      type: isText ? 'injectable' : 'text',
      value: '',
    })
  }

  return (
    <div className={cn('flex items-center gap-2', disabled && 'opacity-50')}>
      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground w-14 shrink-0">
        {label}:
      </span>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={handleTypeToggle}
        disabled={disabled}
        title={isText ? 'Cambiar a variable' : 'Cambiar a texto'}
      >
        {isText ? (
          <Type className="h-3.5 w-3.5" />
        ) : (
          <Variable className="h-3.5 w-3.5 text-role" />
        )}
      </Button>

      {isText ? (
        <Input
          value={field.value}
          onChange={(e) => onChange({ type: 'text', value: e.target.value })}
          placeholder={
            label === 'Nombre' ? 'Nombre del firmante' : 'email@ejemplo.com'
          }
          disabled={disabled}
          className="h-7 text-xs flex-1 min-w-0 border-0 border-b border-input rounded-none bg-transparent focus:border-ring focus-visible:ring-0"
        />
      ) : (
        <Select
          value={field.value}
          onValueChange={(value) => onChange({ type: 'injectable', value })}
          disabled={disabled}
        >
          <SelectTrigger className="h-7 text-xs flex-1 min-w-0 border-0 border-b border-input rounded-none bg-transparent focus:border-ring focus:ring-0">
            <SelectValue placeholder="Seleccionar variable" />
          </SelectTrigger>
          <SelectContent>
            {textVariables.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                No hay variables de texto disponibles
              </div>
            ) : (
              textVariables.map((variable) => (
                <SelectItem
                  key={variable.id}
                  value={variable.variableId}
                  className="text-xs"
                >
                  {variable.label}
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}

export function SignerRoleItem({
  role,
  index,
  isCompactMode,
  isDragging = false,
  isOverlay = false,
  variables,
  allRoles,
  isSelectionMode,
  isSelected,
  onToggleSelection,
  onUpdate,
  onDelete,
}: SignerRoleItemProps) {
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)
  const [showNotificationDialog, setShowNotificationDialog] = useState(false)
  const [isExpanded, setIsExpanded] = useState(!isCompactMode)
  const cardRef = useRef<HTMLDivElement>(null)
  const blurTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Obtener workflowConfig del store
  const workflowConfig = useSignerRolesStore((state) => state.workflowConfig)
  const updateRoleTriggers = useSignerRolesStore((state) => state.updateRoleTriggers)

  // Verificar si estamos en modo individual
  const isIndividualMode = workflowConfig.notifications.scope === 'individual'

  // Obtener los triggers configurados para este rol (o defaults)
  const roleConfig = workflowConfig.notifications.roleConfigs.find(
    (rc) => rc.roleId === role.id
  )
  const defaultTriggers =
    workflowConfig.orderMode === 'parallel'
      ? getDefaultParallelTriggers()
      : getDefaultSequentialTriggers()
  const roleTriggers = roleConfig?.triggers ?? defaultTriggers

  // Handler para guardar notificaciones
  const handleSaveNotifications = (triggers: NotificationTriggerMap) => {
    updateRoleTriggers(role.id, triggers)
  }

  // Auto-colapsar/expandir cuando modo compacto cambia
  useEffect(() => {
    // Cancelar cualquier timeout pendiente del blur para evitar race condition
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
    setIsExpanded(!isCompactMode)
  }, [isCompactMode])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (blurTimeoutRef.current) {
        clearTimeout(blurTimeoutRef.current)
      }
    }
  }, [])

  const handleDeleteClick = useCallback(() => {
    setShowDeleteConfirmation(true)
  }, [])

  const handleConfirmDelete = useCallback(() => {
    onDelete(role.id)
    setShowDeleteConfirmation(false)
  }, [role.id, onDelete])

  // Manejar blur para auto-colapsar en modo compacto
  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      if (isCompactMode && cardRef.current) {
        // Verificar si el nuevo focus está dentro de la card
        if (!cardRef.current.contains(e.relatedTarget as Node)) {
          blurTimeoutRef.current = setTimeout(() => setIsExpanded(false), 150)
        }
      }
    },
    [isCompactMode]
  )

  // Cancelar colapso si el focus vuelve a la card
  const handleFocus = useCallback(() => {
    if (blurTimeoutRef.current) {
      clearTimeout(blurTimeoutRef.current)
      blurTimeoutRef.current = null
    }
  }, [])

  const handleCardClick = useCallback(() => {
    if (isCompactMode) {
      setIsExpanded((prev) => !prev)
    }
  }, [isCompactMode])

  // Handle badge click for selection
  const handleBadgeClick = useCallback(
    (e: React.MouseEvent) => {
      if (isSelectionMode) {
        e.stopPropagation()
        onToggleSelection(role.id)
      } else if (isCompactMode) {
        setIsExpanded((prev) => !prev)
      }
    },
    [isSelectionMode, isCompactMode, role.id, onToggleSelection]
  )

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: role.id, disabled: isOverlay || isSelectionMode })

  // No aplicar transforms del sortable al overlay
  const style = isOverlay
    ? undefined
    : {
        transform: CSS.Transform.toString(transform),
        transition,
      }

  const handleNameChange = (value: SignerRoleFieldValue) => {
    onUpdate(role.id, { name: value })
  }

  const handleEmailChange = (value: SignerRoleFieldValue) => {
    onUpdate(role.id, { email: value })
  }

  return (
    <>
      <div
        ref={(node) => {
          setNodeRef(node)
          if (cardRef) {
            cardRef.current = node
          }
        }}
        style={style}
        onBlur={handleBlur}
        onFocus={handleFocus}
        className={cn(
          'border border-border rounded p-3 bg-card transition-all',
          'hover:border-border/80',
          isCompactMode && !isExpanded && 'cursor-pointer hover:bg-muted/30',
          isDragging && 'opacity-40',
          isOverlay && 'shadow-xl ring-2 ring-primary/20'
        )}
      >
        {/* Header */}
        <motion.div
          layout
          className={cn('flex items-center gap-2', isExpanded && 'mb-3')}
        >
          <div
            {...(isSelectionMode ? {} : { ...attributes, ...listeners })}
            className={cn(
              'p-1 -ml-1 touch-none',
              isSelectionMode
                ? 'text-muted-foreground/20 cursor-default'
                : 'cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-muted-foreground'
            )}
          >
            <GripVertical className="h-4 w-4" />
          </div>

          {/* Número de posición / Checkbox de selección */}
          <motion.span
            className={cn(
              'flex h-5 w-5 items-center justify-center rounded-full shrink-0 select-none touch-none transition-all',
              isSelectionMode
                ? isSelected
                  ? 'bg-foreground/75 text-background border-2 border-foreground/75 cursor-pointer shadow-md'
                  : 'bg-background border-2 border-foreground/50 cursor-pointer shadow-md hover:shadow-lg hover:border-foreground/70'
                : 'bg-muted/50 text-[11px] font-mono font-semibold text-muted-foreground border border-border/50',
              !isSelectionMode && isCompactMode && !isExpanded && 'cursor-pointer hover:bg-muted'
            )}
            onClick={handleBadgeClick}
          >
            <AnimatePresence mode="wait">
              {isSelectionMode ? (
                isSelected ? (
                  <motion.span
                    key="check"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Check className="h-3 w-3" />
                  </motion.span>
                ) : (
                  <motion.span
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  />
                )
              ) : (
                <motion.span
                  key="number"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  {index + 1}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.span>

          <Input
            value={role.label}
            onChange={(e) => onUpdate(role.id, { label: e.target.value })}
            placeholder="Nombre del rol"
            disabled={isSelectionMode}
            className={cn(
              'h-6 text-xs font-medium flex-1 min-w-0 border-transparent bg-transparent px-1 rounded-none',
              isSelectionMode ? 'cursor-default' : 'hover:border-border focus:border-ring'
            )}
          />

          {/* NotificationBadge - solo visible en modo individual */}
          {isIndividualMode && (
            <NotificationBadge
              triggers={roleTriggers}
              onClick={isSelectionMode ? undefined : () => setShowNotificationDialog(true)}
              className={isSelectionMode ? 'opacity-30 cursor-default' : undefined}
            />
          )}

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-6 w-6 shrink-0',
              isSelectionMode
                ? 'text-muted-foreground/20 cursor-default'
                : 'text-muted-foreground/50 hover:text-destructive'
            )}
            onClick={isSelectionMode ? undefined : handleDeleteClick}
            disabled={isSelectionMode}
          >
            <AnimateIcon animateOnHover={!isSelectionMode}>
              <Trash2 size={14} />
            </AnimateIcon>
          </Button>

          {/* Chevron para indicar expandible (solo en modo compacto) */}
          <AnimatePresence mode="popLayout">
            {isCompactMode && (
              <motion.button
                type="button"
                key="chevron"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: 1,
                  scale: 1,
                  rotate: isExpanded ? 180 : 0,
                }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                onClick={handleCardClick}
                className="shrink-0 p-1 rounded hover:bg-muted transition-colors"
              >
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Fields con animación */}
        <motion.div
          initial={false}
          animate={{
            height: isExpanded ? 'auto' : 0,
          }}
          transition={{
            height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] },
          }}
          style={{ overflow: 'hidden' }}
        >
          <div className="space-y-2 pt-2">
            <FieldEditor
              label="Nombre"
              field={role.name}
              variables={variables}
              disabled={isSelectionMode}
              onChange={handleNameChange}
            />
            <FieldEditor
              label="Email"
              field={role.email}
              variables={variables}
              disabled={isSelectionMode}
              onChange={handleEmailChange}
            />
          </div>
        </motion.div>
      </div>

      {/* Notification config dialog (individual mode) */}
      <NotificationConfigDialog
        open={showNotificationDialog}
        onOpenChange={setShowNotificationDialog}
        role={role}
        allRoles={allRoles}
        triggers={roleTriggers}
        orderMode={workflowConfig.orderMode}
        onSave={handleSaveNotifications}
      />

      {/* Delete confirmation dialog */}
      <Dialog
        open={showDeleteConfirmation}
        onOpenChange={setShowDeleteConfirmation}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Eliminar rol
            </DialogTitle>
            <DialogDescription className="pt-2">
              ¿Estás seguro de que deseas eliminar el rol "{role.label}"? Esta
              acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirmation(false)}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              Eliminar rol
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
