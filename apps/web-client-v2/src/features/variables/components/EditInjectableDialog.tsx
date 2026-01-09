import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import {
  Dialog,
  BaseDialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useUpdateWorkspaceInjectable } from '../hooks/useWorkspaceInjectables'
import { InjectableForm } from './InjectableForm'
import type { WorkspaceInjectable } from '../types'

interface EditInjectableDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  injectable: WorkspaceInjectable | null
}

export function EditInjectableDialog({
  open,
  onOpenChange,
  injectable,
}: EditInjectableDialogProps): React.ReactElement {
  const { t } = useTranslation()
  const [key, setKey] = useState('')
  const [label, setLabel] = useState('')
  const [defaultValue, setDefaultValue] = useState('')
  const [description, setDescription] = useState('')
  const updateInjectable = useUpdateWorkspaceInjectable()

  useEffect(() => {
    if (open && injectable) {
      setKey(injectable.key)
      setLabel(injectable.label)
      setDefaultValue(injectable.defaultValue || '')
      setDescription(injectable.description || '')
    }
  }, [open, injectable])

  async function handleSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault()
    if (!injectable || !key.trim() || !label.trim() || !defaultValue.trim())
      return

    try {
      await updateInjectable.mutateAsync({
        id: injectable.id,
        data: {
          key: key.trim(),
          label: label.trim(),
          defaultValue: defaultValue.trim(),
          description: description.trim() || undefined,
        },
      })
      onOpenChange(false)
    } catch {
      // Error is handled by mutation
    }
  }

  const isValid =
    key.trim().length > 0 &&
    label.trim().length > 0 &&
    defaultValue.trim().length > 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <BaseDialogContent className="max-w-md">
        <div className="flex items-start justify-between border-b border-border p-6">
          <div>
            <DialogTitle className="font-mono text-sm font-medium uppercase tracking-widest text-foreground">
              {t('variables.editDialog.title', 'Edit Variable')}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm font-light text-muted-foreground">
              {t(
                'variables.editDialog.description',
                'Update the variable properties'
              )}
            </DialogDescription>
          </div>
          <DialogClose className="text-muted-foreground transition-colors hover:text-foreground">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>

        <form onSubmit={handleSubmit}>
          <InjectableForm
            keyValue={key}
            onKeyChange={setKey}
            label={label}
            onLabelChange={setLabel}
            defaultValue={defaultValue}
            onDefaultValueChange={setDefaultValue}
            description={description}
            onDescriptionChange={setDescription}
            idPrefix="edit-injectable"
          />

          <div className="flex justify-end gap-3 border-t border-border p-6">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={updateInjectable.isPending}
              className="rounded-none border border-border bg-background px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={!isValid || updateInjectable.isPending}
              className="rounded-none bg-foreground px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
            >
              {updateInjectable.isPending
                ? t('common.saving', 'Saving...')
                : t('common.save', 'Save Changes')}
            </button>
          </div>
        </form>
      </BaseDialogContent>
    </Dialog>
  )
}
