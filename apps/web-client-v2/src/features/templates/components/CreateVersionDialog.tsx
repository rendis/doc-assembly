import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from '@tanstack/react-router'
import { X } from 'lucide-react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'
import { useCreateVersion } from '../hooks/useTemplateDetail'
import { useAppContextStore } from '@/stores/app-context-store'

interface CreateVersionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  templateId: string
}

export function CreateVersionDialog({
  open,
  onOpenChange,
  templateId,
}: CreateVersionDialogProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentWorkspace } = useAppContextStore()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const createVersion = useCreateVersion(templateId)

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName('')
      setDescription('')
      setIsSubmitting(false)
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !currentWorkspace || isSubmitting) return

    setIsSubmitting(true)

    try {
      const response = await createVersion.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
      })

      onOpenChange(false)

      // Navigate to the editor with the new version
      navigate({
        to: '/workspace/$workspaceId/editor/$versionId',
        params: {
          workspaceId: currentWorkspace.id,
          versionId: response.id,
        },
      })
    } catch {
      setIsSubmitting(false)
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] border border-border bg-background p-0 shadow-lg duration-200',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]'
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border p-6">
            <div>
              <h2 className="font-mono text-sm font-medium uppercase tracking-widest text-foreground">
                {t('templates.createVersionDialog.title', 'New Version')}
              </h2>
              <p className="mt-1 text-sm font-light text-muted-foreground">
                {t(
                  'templates.createVersionDialog.description',
                  'Create a new version of this template'
                )}
              </p>
            </div>
            <DialogPrimitive.Close className="text-muted-foreground transition-colors hover:text-foreground">
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="space-y-6 p-6">
              {/* Name field */}
              <div>
                <label
                  htmlFor="version-name"
                  className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground"
                >
                  {t('templates.createVersionDialog.nameLabel', 'Version Name')}
                </label>
                <input
                  id="version-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t(
                    'templates.createVersionDialog.namePlaceholder',
                    'e.g., Initial Draft, Review Changes...'
                  )}
                  maxLength={100}
                  autoFocus
                  className="w-full rounded-none border-0 border-b border-border bg-transparent py-2 text-base font-light text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-foreground focus:ring-0"
                />
              </div>

              {/* Description field */}
              <div>
                <label
                  htmlFor="version-description"
                  className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground"
                >
                  {t('templates.createVersionDialog.descriptionLabel', 'Description')}
                  <span className="ml-2 normal-case tracking-normal text-muted-foreground/60">
                    ({t('common.optional', 'optional')})
                  </span>
                </label>
                <textarea
                  id="version-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t(
                    'templates.createVersionDialog.descriptionPlaceholder',
                    'Optional description of changes...'
                  )}
                  rows={3}
                  className="w-full resize-none rounded-none border-0 border-b border-border bg-transparent py-2 text-base font-light text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-foreground focus:ring-0"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-border p-6">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
                className="rounded-none border border-border bg-background px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={!name.trim() || isSubmitting}
                className="rounded-none bg-foreground px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
              >
                {isSubmitting
                  ? t('common.creating', 'Creating...')
                  : t('templates.createVersionDialog.submit', 'Create Version')}
              </button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
