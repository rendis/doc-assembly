import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useCreateFolder } from '../hooks/useFolders'

interface CreateFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  parentId: string | null
}

export function CreateFolderDialog({
  open,
  onOpenChange,
  parentId,
}: CreateFolderDialogProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const createFolder = useCreateFolder()

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setName('')
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return

    try {
      await createFolder.mutateAsync({
        name: name.trim(),
        parentId: parentId ?? undefined,
      })
      onOpenChange(false)
    } catch {
      // Error is handled by mutation
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] border border-border bg-background p-0 shadow-lg"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border p-6">
            <div>
              <h2 className="font-mono text-sm font-medium uppercase tracking-widest text-foreground">
                {t('folders.createDialog.title', 'New Folder')}
              </h2>
              <p className="mt-1 text-sm font-light text-muted-foreground">
                {t(
                  'folders.createDialog.description',
                  'Create a new folder to organize your templates'
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
            <div className="p-6">
              {/* Name field */}
              <div>
                <label
                  htmlFor="folder-name"
                  className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground"
                >
                  {t('folders.createDialog.nameLabel', 'Name')}
                </label>
                <input
                  id="folder-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t(
                    'folders.createDialog.namePlaceholder',
                    'Enter folder name...'
                  )}
                  maxLength={255}
                  autoFocus
                  className="w-full rounded-none border-0 border-b border-border bg-transparent py-2 text-base font-light text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-foreground focus:ring-0"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-border p-6">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                disabled={createFolder.isPending}
                className="rounded-none border border-border bg-background px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
              >
                {t('common.cancel', 'Cancel')}
              </button>
              <button
                type="submit"
                disabled={!name.trim() || createFolder.isPending}
                className="rounded-none bg-foreground px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
              >
                {createFolder.isPending
                  ? t('common.creating', 'Creating...')
                  : t('folders.createDialog.submit', 'Create Folder')}
              </button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
