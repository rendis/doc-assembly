import { useState, useCallback, useRef, useEffect } from 'react'
import { GripVertical, Trash2, Type, Variable, AlertTriangle, ChevronDown } from 'lucide-react'
import { motion } from 'framer-motion'
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
  onChange: (value: SignerRoleFieldValue) => void
}

function FieldEditor({ label, field, variables, onChange }: FieldEditorProps) {
  const isText = field.type === 'text'
  const textVariables = variables.filter((v) => v.type === 'TEXT')

  const handleTypeToggle = () => {
    onChange({
      type: isText ? 'injectable' : 'text',
      value: '',
    })
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground w-14 shrink-0">
        {label}:
      </span>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
        onClick={handleTypeToggle}
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
          className="h-7 text-xs flex-1 min-w-0 border-0 border-b border-input rounded-none bg-transparent focus:border-ring focus-visible:ring-0"
        />
      ) : (
        <Select
          value={field.value}
          onValueChange={(value) => onChange({ type: 'injectable', value })}
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

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: role.id, disabled: isOverlay })

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
        <div className={cn('flex items-center gap-2', isExpanded && 'mb-3')}>
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground/50 hover:text-muted-foreground touch-none"
          >
            <GripVertical className="h-4 w-4" />
          </div>

          {/* Número de posición */}
          <span
            className={cn(
              'flex h-5 w-5 items-center justify-center rounded-full bg-muted/50 text-[11px] font-mono font-semibold text-muted-foreground border border-border/50 shrink-0',
              isCompactMode && !isExpanded && 'cursor-pointer hover:bg-muted'
            )}
            onClick={handleCardClick}
          >
            {index + 1}
          </span>

          <Input
            value={role.label}
            onChange={(e) => onUpdate(role.id, { label: e.target.value })}
            placeholder="Nombre del rol"
            className="h-6 text-xs font-medium flex-1 min-w-0 border-transparent bg-transparent hover:border-border focus:border-ring px-1 rounded-none"
          />

          {/* NotificationBadge - solo visible en modo individual */}
          {isIndividualMode && (
            <NotificationBadge
              triggers={roleTriggers}
              onClick={() => setShowNotificationDialog(true)}
            />
          )}

          {/* Chevron para indicar expandible (solo en modo compacto) */}
          {isCompactMode && (
            <motion.button
              type="button"
              onClick={handleCardClick}
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="shrink-0 p-1 rounded hover:bg-muted transition-colors"
            >
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </motion.button>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground/50 hover:text-destructive shrink-0"
            onClick={handleDeleteClick}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Fields con animación */}
        <motion.div
          initial={false}
          animate={{
            height: isExpanded ? 'auto' : 0,
            opacity: isExpanded ? 1 : 0,
          }}
          transition={{
            height: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
            opacity: { duration: 0.15, delay: isExpanded ? 0.05 : 0 },
          }}
          style={{ overflow: 'hidden' }}
        >
          <div className="space-y-2">
            <FieldEditor
              label="Nombre"
              field={role.name}
              variables={variables}
              onChange={handleNameChange}
            />
            <FieldEditor
              label="Email"
              field={role.email}
              variables={variables}
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
