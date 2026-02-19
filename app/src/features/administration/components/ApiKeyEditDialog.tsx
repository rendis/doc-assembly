import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'
import type { AutomationKey } from '../api/automation-keys-api'
import { useUpdateAutomationKey } from '../hooks/useAutomationKeys'

interface ApiKeyEditDialogProps {
  open: boolean
  keyData: AutomationKey | null
  onClose: () => void
}

export function ApiKeyEditDialog({ open, keyData, onClose }: ApiKeyEditDialogProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [name, setName] = useState(keyData?.name ?? '')
  const updateKey = useUpdateAutomationKey()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!keyData || !name.trim()) return

    try {
      await updateKey.mutateAsync({ id: keyData.id, data: { name: name.trim() } })
      toast({ title: t('administration.apiKeys.updateSuccess', 'API key updated') })
      onClose()
    } catch {
      toast({
        title: t('administration.apiKeys.updateError', 'Failed to update API key'),
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog key={keyData?.id} open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('administration.apiKeys.form.editTitle', 'Edit API Key')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'administration.apiKeys.form.editDescription',
              'Update the name or tenant restrictions for this key.'
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-key-name">
              {t('administration.apiKeys.form.name', 'Key Name')}
            </Label>
            <Input
              id="edit-key-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={!name.trim() || updateKey.isPending}>
              {updateKey.isPending ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
