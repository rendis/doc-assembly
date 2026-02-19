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
import type { CreateAutomationKeyResponse } from '../api/automation-keys-api'
import { useCreateAutomationKey } from '../hooks/useAutomationKeys'

interface ApiKeyCreateDialogProps {
  open: boolean
  onClose: () => void
  onCreated: (result: CreateAutomationKeyResponse) => void
}

export function ApiKeyCreateDialog({ open, onClose, onCreated }: ApiKeyCreateDialogProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [name, setName] = useState('')
  const createKey = useCreateAutomationKey()

  function handleClose() {
    setName('')
    onClose()
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) return

    try {
      const result = await createKey.mutateAsync({ name: name.trim() })
      setName('')
      onCreated(result)
    } catch {
      toast({
        title: t('administration.apiKeys.createError', 'Failed to create API key'),
        variant: 'destructive',
      })
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('administration.apiKeys.form.createTitle', 'Create API Key')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'administration.apiKeys.form.createDescription',
              'Create a new automation API key for machine-to-machine access.'
            )}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="key-name">
              {t('administration.apiKeys.form.name', 'Key Name')}
            </Label>
            <Input
              id="key-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('administration.apiKeys.form.namePlaceholder', 'e.g. CI/CD Pipeline')}
              required
              autoFocus
            />
          </div>

          <p className="text-xs text-muted-foreground">
            {t(
              'administration.apiKeys.form.allowedTenantsHint',
              'Leave empty for global access (all tenants).'
            )}
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={!name.trim() || createKey.isPending}>
              {createKey.isPending
                ? t('common.creating', 'Creating...')
                : t('common.create', 'Create')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
