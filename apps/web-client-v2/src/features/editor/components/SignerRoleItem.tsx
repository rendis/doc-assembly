import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { GripVertical, AlertTriangle, ChevronDown, Check, Type, Variable } from 'lucide-react'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
  /** Whether the item is editable (false when document is published) */
  editable?: boolean
}

interface FieldTypeToggleProps {
  value: 'text' | 'injectable'
  onChange: (value: 'text' | 'injectable') => void
  disabled?: boolean
}

function FieldTypeToggle({ value, onChange, disabled }: FieldTypeToggleProps) {
  const { t } = useTranslation()
  const isVariable = value === 'injectable'

  return (
    <TooltipProvider delayDuration={300}>
      <div className="inline-flex items-center gap-1 shrink-0">
        {/* Text icon */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => onChange('text')}
              disabled={disabled}
              className={cn(
                'p-1 rounded transition-colors',
                !isVariable
                  ? 'text-foreground'
                  : 'text-muted-foreground/50 hover:text-muted-foreground',
                disabled && 'pointer-events-none opacity-50'
              )}
            >
              <Type className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {t('editor.roles.card.fieldType.text')}
          </TooltipContent>
        </Tooltip>

        {/* Switch track */}
        <button
          type="button"
          onClick={() => onChange(isVariable ? 'text' : 'injectable')}
          disabled={disabled}
          className={cn(
            'relative w-8 h-4 rounded-full transition-colors border',
            isVariable
              ? 'bg-role-muted border-role-muted'
              : 'bg-muted-foreground/20 border-muted-foreground/30',
            disabled && 'pointer-events-none opacity-50'
          )}
        >
          {/* Switch knob */}
          <motion.div
            className={cn(
              'absolute top-0.5 w-3 h-3 rounded-full shadow-sm',
              isVariable ? 'bg-role-foreground' : 'bg-foreground'
            )}
            animate={{ left: isVariable ? 16 : 2 }}
            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
          />
        </button>

        {/* Variable icon */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => onChange('injectable')}
              disabled={disabled}
              className={cn(
                'p-1 rounded transition-colors',
                isVariable
                  ? 'text-role-foreground'
                  : 'text-muted-foreground/50 hover:text-muted-foreground',
                disabled && 'pointer-events-none opacity-50'
              )}
            >
              <Variable className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {t('editor.roles.card.fieldType.variable')}
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  )
}

interface FieldEditorProps {
  label: string
  fieldType: 'name' | 'email'
  field: SignerRoleFieldValue
  variables: VariableType[]
  disabled?: boolean
  onChange: (value: SignerRoleFieldValue) => void
}

function FieldEditor({ label, fieldType, field, variables, disabled, onChange }: FieldEditorProps) {
  const { t } = useTranslation()
  const textVariables = variables.filter((v) => v.type === 'TEXT')

  return (
    <div className={cn('flex items-center gap-2 overflow-hidden', disabled && 'opacity-50')}>
      <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground w-11 shrink-0">
        {label}:
      </span>

      <FieldTypeToggle
        value={field.type}
        onChange={(type) => onChange({ type, value: '' })}
        disabled={disabled}
      />

      {field.type === 'text' ? (
        <Input
          value={field.value}
          onChange={(e) => onChange({ type: 'text', value: e.target.value })}
          placeholder={t(`editor.roles.card.placeholders.${fieldType}`)}
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
            <SelectValue placeholder={t('editor.roles.card.selectVariable')} />
          </SelectTrigger>
          <SelectContent>
            {textVariables.length === 0 ? (
              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                {t('editor.roles.card.noVariables')}
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
  editable = true,
}: SignerRoleItemProps) {
  // Combine editable and selection mode for disabling interactions
  const isDisabled = !editable || isSelectionMode
  const { t } = useTranslation()
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional sync with compact mode
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
    isDragging: _isSortableDragging,
  } = useSortable({ id: role.id, disabled: isOverlay || isDisabled })

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
          'border border-border rounded-lg p-3 bg-card transition-all',
          // Efecto 3D base
          'shadow-sm',
          // Hover: elevación
          'hover:shadow-md hover:-translate-y-0.5 hover:border-border/60',
          isCompactMode && !isExpanded && 'cursor-pointer hover:bg-muted/30',
          isDragging && 'opacity-40 scale-[0.98]',
          isOverlay && 'shadow-xl ring-2 ring-primary/20 rotate-1 scale-105'
        )}
      >
        {/* Header */}
        <motion.div
          layout={!isDragging && !isOverlay}
          animate={{ marginBottom: isExpanded ? 12 : 0 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="flex items-center gap-2"
        >
          <div
            {...(isDisabled ? {} : { ...attributes, ...listeners })}
            className={cn(
              'p-1 -ml-1 touch-none',
              isDisabled
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
            placeholder={t('editor.roles.card.placeholder')}
            disabled={isDisabled}
            className={cn(
              'h-6 text-xs font-medium flex-1 min-w-0 border-transparent bg-transparent px-1 rounded-none',
              isDisabled ? 'cursor-default' : 'hover:border-border focus:border-ring'
            )}
          />

          {/* NotificationBadge - solo visible en modo individual */}
          {isIndividualMode && (
            <NotificationBadge
              triggers={roleTriggers}
              onClick={isDisabled ? undefined : () => setShowNotificationDialog(true)}
              className={isDisabled ? 'opacity-30 cursor-default' : undefined}
            />
          )}

          <Button
            variant="ghost"
            size="icon"
            className={cn(
              'h-6 w-6 shrink-0',
              isDisabled
                ? 'text-muted-foreground/20 cursor-default'
                : 'text-muted-foreground/50 hover:text-destructive'
            )}
            onClick={isDisabled ? undefined : handleDeleteClick}
            disabled={isDisabled}
          >
            <AnimateIcon animateOnHover={!isDisabled}>
              <Trash2 size={14} />
            </AnimateIcon>
          </Button>

          {/* Chevron para indicar expandible (solo en modo compacto) */}
          <motion.button
            type="button"
            initial={false}
            animate={{
              opacity: isCompactMode ? 1 : 0,
              width: isCompactMode ? 'auto' : 0,
            }}
            transition={{
              duration: 0.2,
              ease: [0.4, 0, 0.2, 1],
              opacity: { duration: 0.15 },
            }}
            onClick={handleCardClick}
            className={cn(
              'shrink-0 rounded hover:bg-muted transition-colors overflow-hidden',
              !isCompactMode && 'pointer-events-none'
            )}
          >
            <motion.div
              className="p-1"
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            >
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </motion.div>
          </motion.button>
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
          style={{ overflowY: 'hidden', overflowX: 'visible' }}
        >
          <div className="space-y-2 pt-2">
            <FieldEditor
              label={t('editor.roles.card.fields.name')}
              fieldType="name"
              field={role.name}
              variables={variables}
              disabled={isDisabled}
              onChange={handleNameChange}
            />
            <FieldEditor
              label={t('editor.roles.card.fields.email')}
              fieldType="email"
              field={role.email}
              variables={variables}
              disabled={isDisabled}
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
              {t('editor.roles.card.delete.title')}
            </DialogTitle>
            <DialogDescription className="pt-2">
              {t('editor.roles.card.delete.confirmation', { name: role.label })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirmation(false)}
            >
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleConfirmDelete}>
              {t('editor.roles.card.delete.title')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
