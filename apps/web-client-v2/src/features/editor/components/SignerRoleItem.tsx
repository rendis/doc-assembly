import { useState, useCallback } from 'react'
import { GripVertical, Trash2, Type, Variable, AlertTriangle } from 'lucide-react'
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
import type {
  SignerRoleDefinition,
  SignerRoleFieldValue,
} from '../types/signer-roles'
import type { Variable as VariableType } from '../types/variables'

interface SignerRoleItemProps {
  role: SignerRoleDefinition
  variables: VariableType[]
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
  variables,
  onUpdate,
  onDelete,
}: SignerRoleItemProps) {
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false)

  const handleDeleteClick = useCallback(() => {
    // TODO: Check for injectables in document when editor-store is connected
    setShowDeleteConfirmation(true)
  }, [])

  const handleConfirmDelete = useCallback(() => {
    onDelete(role.id)
    setShowDeleteConfirmation(false)
  }, [role.id, onDelete])

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: role.id })

  const style = {
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
        ref={setNodeRef}
        style={style}
        className={cn(
          'border border-border rounded p-3 bg-card transition-all',
          isDragging && 'shadow-lg ring-2 ring-ring/20 opacity-90 z-50',
          'hover:border-border/80'
        )}
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-3">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-muted-foreground/50 hover:text-muted-foreground touch-none"
          >
            <GripVertical className="h-4 w-4" />
          </div>

          <Input
            value={role.label}
            onChange={(e) => onUpdate(role.id, { label: e.target.value })}
            placeholder="Nombre del rol"
            className="h-6 text-xs font-medium flex-1 min-w-0 border-transparent bg-transparent hover:border-border focus:border-ring px-1 rounded-none"
          />

          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground/50 hover:text-destructive shrink-0"
            onClick={handleDeleteClick}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* Fields */}
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
      </div>

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
