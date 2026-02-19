import { useState, useCallback, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { NodeSelection } from '@tiptap/pm/state'
import {
  Settings2,
  Trash2,
  CheckSquare,
  Circle,
  Type,
  AlertTriangle,
  FormInput,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useSignerRolesStore } from '../../stores/signer-roles-store'
import { InteractiveFieldConfigDialog } from './InteractiveFieldConfigDialog'
import type {
  InteractiveFieldAttrs,
  InteractiveFieldType,
  InteractiveFieldOption,
} from './InteractiveFieldExtension'

const fieldTypeIcons: Record<InteractiveFieldType, typeof CheckSquare> = {
  checkbox: CheckSquare,
  radio: Circle,
  text: Type,
}

const fieldTypeLabels: Record<InteractiveFieldType, string> = {
  checkbox: 'editor.interactiveField.types.checkbox',
  radio: 'editor.interactiveField.types.radio',
  text: 'editor.interactiveField.types.text',
}

export const InteractiveFieldComponent = (props: NodeViewProps) => {
  const { node, selected, editor, getPos, updateAttributes } = props
  const { t } = useTranslation()

  const fieldType = (node.attrs.fieldType ?? 'checkbox') as InteractiveFieldType
  const roleId = (node.attrs.roleId ?? '') as string
  const label = (node.attrs.label ?? '') as string
  const required = (node.attrs.required ?? false) as boolean
  const options = useMemo(
    () => (node.attrs.options ?? []) as InteractiveFieldOption[],
    [node.attrs.options]
  )
  const placeholder = (node.attrs.placeholder ?? '') as string

  const isEditorEditable = editor.isEditable

  const [configOpen, setConfigOpen] = useState(false)
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

  // Look up role from store
  const roles = useSignerRolesStore((state) => state.roles)
  const role = useMemo(
    () => roles.find((r) => r.id === roleId),
    [roles, roleId]
  )
  const isInvalid = !!roleId && !role

  const Icon = fieldTypeIcons[fieldType] || CheckSquare

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!isEditorEditable) return
      setConfigOpen(true)
    },
    [isEditorEditable]
  )

  const handleSelectNode = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const pos = getPos()
      if (typeof pos === 'number') {
        const tr = editor.state.tr.setSelection(
          NodeSelection.create(editor.state.doc, pos)
        )
        editor.view.dispatch(tr)
        editor.view.focus()
      }
    },
    [editor, getPos]
  )

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const pos = getPos()
      if (typeof pos === 'number') {
        const tr = editor.state.tr.setSelection(
          NodeSelection.create(editor.state.doc, pos)
        )
        editor.view.dispatch(tr)
        editor.commands.deleteSelection()
      }
    },
    [editor, getPos]
  )

  const handleSave = useCallback(
    (newAttrs: Partial<InteractiveFieldAttrs>) => {
      updateAttributes(newAttrs)
    },
    [updateAttributes]
  )

  const renderFieldPreview = () => {
    if (fieldType === 'checkbox' || fieldType === 'radio') {
      if (options.length === 0) {
        return (
          <span className="text-xs text-muted-foreground italic">
            {t('editor.interactiveField.noOptions')}
          </span>
        )
      }
      return (
        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
          {options.map((opt) => (
            <span key={opt.id} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              {fieldType === 'checkbox' ? (
                <span className="text-sm leading-none">&#9744;</span>
              ) : (
                <span className="text-sm leading-none">&#9675;</span>
              )}
              {opt.label || t('editor.interactiveField.untitledOption')}
            </span>
          ))}
        </div>
      )
    }

    // text field
    return (
      <div className="mt-1 px-2 py-1 border border-dashed border-muted-foreground/30 rounded text-xs text-muted-foreground/60 bg-muted/30 max-w-xs truncate">
        {placeholder || t('editor.interactiveField.textPlaceholder')}
      </div>
    )
  }

  return (
    <NodeViewWrapper className="my-4">
      <div
        contentEditable={false}
        onClick={handleSelectNode}
        onDoubleClick={handleDoubleClick}
        className={cn(
          'relative w-full p-4 border-2 border-dashed rounded-lg transition-colors select-none',
          isInvalid
            ? 'bg-destructive/10 dark:bg-destructive/15'
            : isDirectlySelected
              ? 'bg-primary/5 dark:bg-primary/10'
              : 'bg-muted/30 dark:bg-muted/20 hover:bg-muted/50 dark:hover:bg-muted/30'
        )}
        style={{
          borderColor: isInvalid
            ? 'hsl(var(--destructive) / 0.6)'
            : isDirectlySelected
              ? 'hsl(var(--primary) / 0.6)'
              : 'hsl(var(--border))',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}
      >
        {/* Drag handles */}
        <div data-drag-handle className="absolute inset-x-0 top-0 h-3 cursor-grab" />
        <div data-drag-handle className="absolute inset-x-0 bottom-0 h-3 cursor-grab" />
        <div data-drag-handle className="absolute inset-y-0 left-0 w-3 cursor-grab" />
        <div data-drag-handle className="absolute inset-y-0 right-0 w-3 cursor-grab" />

        {/* Tab label */}
        <div data-drag-handle onDoubleClick={handleDoubleClick} className="absolute -top-3 left-4 z-10 cursor-grab">
          <div
            className={cn(
              'px-2 h-6 bg-card flex items-center gap-1.5 text-xs font-medium border rounded shadow-sm transition-colors',
              isInvalid
                ? 'text-destructive border-destructive'
                : isDirectlySelected
                  ? 'text-primary border-primary/50'
                  : 'text-muted-foreground border-border hover:border-primary/50 hover:text-primary'
            )}
          >
            <FormInput className="h-3.5 w-3.5" />
            <span>{t('editor.interactiveField.title')}</span>
          </div>
        </div>

        {/* Content */}
        <div className="flex items-start gap-3 pt-1">
          {/* Field type icon */}
          <div className="flex-shrink-0 mt-0.5">
            {isInvalid ? (
              <AlertTriangle className="h-4 w-4 text-destructive animate-error-pulse" />
            ) : (
              <Icon className="h-4 w-4 text-muted-foreground" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            {/* Header row: role badge + label + required */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Role badge */}
              {roleId ? (
                isInvalid ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-destructive/20 text-destructive border border-dashed border-destructive/50">
                        <AlertTriangle className="h-3 w-3" />
                        {t('editor.interactiveField.deletedRole')}
                      </span>
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
                ) : (
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-role-muted text-role-foreground border border-role-border/50">
                    {role!.label}
                  </span>
                )
              ) : (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground border border-border">
                  {t('editor.interactiveField.noRole')}
                </span>
              )}

              {/* Field type label */}
              <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                {t(fieldTypeLabels[fieldType])}
              </span>

              {/* Required badge */}
              {required && (
                <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  {t('editor.interactiveField.required')}
                </span>
              )}
            </div>

            {/* Field label */}
            <p className="text-sm font-medium mt-1 text-foreground">
              {label || (
                <span className="text-muted-foreground italic">
                  {t('editor.interactiveField.noLabel')}
                </span>
              )}
            </p>

            {/* Options / text preview */}
            {renderFieldPreview()}
          </div>
        </div>

        {/* Floating toolbar */}
        {isEditorEditable && isDirectlySelected && (
          <TooltipProvider delayDuration={300}>
            <div data-toolbar className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-background border rounded-lg shadow-lg p-1 z-50">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleDoubleClick}
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{t('editor.interactiveField.configure')}</p>
                </TooltipContent>
              </Tooltip>
              <div className="w-px h-6 bg-border mx-1" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{t('common.delete')}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        )}
      </div>

      {/* Config dialog */}
      <InteractiveFieldConfigDialog
        open={configOpen}
        onOpenChange={setConfigOpen}
        attrs={{
          id: node.attrs.id as string,
          fieldType,
          roleId,
          label,
          required,
          options,
          placeholder,
          maxLength: (node.attrs.maxLength ?? 0) as number,
        }}
        onSave={handleSave}
      />
    </NodeViewWrapper>
  )
}
