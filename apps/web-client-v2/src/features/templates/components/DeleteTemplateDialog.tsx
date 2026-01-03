import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { X, AlertTriangle } from 'lucide-react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'
import { useDeleteTemplate } from '../hooks/useTemplates'
import type { TemplateListItem } from '@/types/api'

interface DeleteTemplateDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  template: TemplateListItem | null
}

export function DeleteTemplateDialog({
  open,
  onOpenChange,
  template,
}: DeleteTemplateDialogProps) {
  const { t } = useTranslation()
  const [isDeleting, setIsDeleting] = useState(false)
  const deleteTemplate = useDeleteTemplate()

  const handleDelete = async () => {
    if (!template || isDeleting) return

    setIsDeleting(true)

    try {
      await deleteTemplate.mutateAsync(template.id)
      onOpenChange(false)
    } catch {
      // Error is handled by mutation
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] border border-border bg-background p-0 shadow-lg duration-200',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]'
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center bg-destructive/10">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <h2 className="font-mono text-sm font-medium uppercase tracking-widest text-foreground">
                  {t('templates.deleteDialog.title', 'Delete Template')}
                </h2>
              </div>
            </div>
            <DialogPrimitive.Close className="text-muted-foreground transition-colors hover:text-foreground">
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-sm font-light text-muted-foreground">
              {t(
                'templates.deleteDialog.message',
                'Are you sure you want to delete "{{name}}"? This action cannot be undone.',
                { name: template?.title ?? '' }
              )}
            </p>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-border p-6">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={isDeleting}
              className="rounded-none border border-border bg-background px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={isDeleting}
              className="rounded-none bg-destructive px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
            >
              {isDeleting
                ? t('common.deleting', 'Deleting...')
                : t('templates.deleteDialog.confirm', 'Delete')}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
