import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { FolderPlus } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-primary" />
            {t('folders.createDialog.title', 'Create New Folder')}
          </DialogTitle>
          <DialogDescription className="space-y-2">
            {t(
              'folders.createDialog.description',
              'Enter a name for your new folder.'
            )}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">
                {t('folders.createDialog.nameLabel', 'Folder Name')}
              </Label>
              <Input
                id="folder-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t(
                  'folders.createDialog.namePlaceholder',
                  'Enter folder name...'
                )}
                maxLength={255}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={!name.trim() || createFolder.isPending}>
              {createFolder.isPending
                ? t('common.creating', 'Creating...')
                : t('common.create', 'Create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
