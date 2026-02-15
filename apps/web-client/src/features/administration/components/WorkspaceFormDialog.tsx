import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Workspace, WorkspaceSettings } from '@/features/workspaces/types'
import {
  useCreateWorkspace,
  useUpdateWorkspace,
} from '@/features/workspaces/hooks/useWorkspaces'
import { useToast } from '@/components/ui/use-toast'
import { useAppContextStore } from '@/stores/app-context-store'

interface WorkspaceFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  workspace?: Workspace | null
}

export function WorkspaceFormDialog({
  open,
  onOpenChange,
  mode,
  workspace,
}: WorkspaceFormDialogProps): React.ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <WorkspaceFormDialogContent
          onOpenChange={onOpenChange}
          mode={mode}
          workspace={workspace}
        />
      )}
    </Dialog>
  )
}

function WorkspaceFormDialogContent({
  onOpenChange,
  mode,
  workspace,
}: {
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  workspace?: Workspace | null
}): React.ReactElement {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { currentWorkspace } = useAppContextStore()

  const [name, setName] = useState(mode === 'edit' && workspace ? workspace.name : '')
  const [theme, setTheme] = useState(mode === 'edit' && workspace ? (workspace.settings?.theme || '') : '')
  const [logoUrl, setLogoUrl] = useState(mode === 'edit' && workspace ? (workspace.settings?.logoUrl || '') : '')
  const [primaryColor, setPrimaryColor] = useState(mode === 'edit' && workspace ? (workspace.settings?.primaryColor || '') : '')
  const [nameError, setNameError] = useState('')

  const createMutation = useCreateWorkspace()
  const updateMutation = useUpdateWorkspace()

  const isLoading = createMutation.isPending || updateMutation.isPending

  const validateForm = (): boolean => {
    let isValid = true

    if (!name.trim()) {
      setNameError(t('administration.workspaces.form.nameRequired', 'Name is required'))
      isValid = false
    } else if (name.length > 255) {
      setNameError(t('administration.workspaces.form.nameTooLong', 'Name must be 255 characters or less'))
      isValid = false
    } else {
      setNameError('')
    }

    return isValid
  }

  const buildSettings = (): WorkspaceSettings | undefined => {
    const settings: WorkspaceSettings = {}
    if (theme.trim()) settings.theme = theme.trim()
    if (logoUrl.trim()) settings.logoUrl = logoUrl.trim()
    if (primaryColor.trim()) settings.primaryColor = primaryColor.trim()
    return Object.keys(settings).length > 0 ? settings : undefined
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync({
          name: name.trim(),
          type: 'CLIENT', // Always CLIENT for user-created workspaces
        })
        toast({
          title: t('administration.workspaces.form.createSuccess', 'Workspace created'),
        })
      } else if (workspace) {
        // For edit, we need to temporarily switch to the workspace context
        // Store current workspace to restore later

        // Note: The update endpoint operates on /workspace (current workspace context)
        // This is a limitation - we may need a different endpoint for admin updates
        // For now, we'll just update settings if they match current workspace
        if (currentWorkspace?.id === workspace.id) {
          await updateMutation.mutateAsync({
            name: name.trim(),
            settings: buildSettings(),
          })
          toast({
            title: t('administration.workspaces.form.updateSuccess', 'Workspace updated'),
          })
        } else {
          // Can't edit a different workspace from current context
          // This would require a tenant-level update endpoint
          toast({
            variant: 'destructive',
            title: t('common.error', 'Error'),
            description: t('administration.workspaces.form.editContextError', 'Cannot edit workspace outside its context'),
          })
          return
        }
      }
      onOpenChange(false)
    } catch {
      toast({
        variant: 'destructive',
        title: t('common.error', 'Error'),
        description: t('administration.workspaces.form.saveError', 'Failed to save workspace'),
      })
    }
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>
          {mode === 'create'
            ? t('administration.workspaces.form.createTitle', 'Create Workspace')
            : t('administration.workspaces.form.editTitle', 'Edit Workspace')}
        </DialogTitle>
        <DialogDescription>
          {mode === 'create'
            ? t('administration.workspaces.form.createDescription', 'Create a new workspace for this tenant.')
            : t('administration.workspaces.form.editDescription', 'Update workspace details.')}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name field */}
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            {t('administration.workspaces.form.name', 'Name')} *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setNameError('')
            }}
            placeholder={t('administration.workspaces.form.namePlaceholder', 'Workspace name')}
            className={cn(
              'w-full rounded-sm border bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-foreground',
              nameError ? 'border-destructive' : 'border-border'
            )}
            disabled={isLoading}
          />
          {nameError && (
            <p className="mt-1 text-xs text-destructive">{nameError}</p>
          )}
        </div>

        {/* Settings section - collapsible or optional */}
        <div className="space-y-3 border-t border-border pt-4">
          <p className="text-sm font-medium text-muted-foreground">
            {t('administration.workspaces.form.settings', 'Settings (Optional)')}
          </p>

          {/* Theme */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t('administration.workspaces.form.theme', 'Theme')}
            </label>
            <input
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder={t('administration.workspaces.form.themePlaceholder', 'e.g., light, dark')}
              className="w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-foreground"
              disabled={isLoading}
            />
          </div>

          {/* Logo URL */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t('administration.workspaces.form.logoUrl', 'Logo URL')}
            </label>
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder={t('administration.workspaces.form.logoUrlPlaceholder', 'https://example.com/logo.png')}
              className="w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-foreground"
              disabled={isLoading}
            />
          </div>

          {/* Primary Color */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t('administration.workspaces.form.primaryColor', 'Primary Color')}
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={primaryColor}
                onChange={(e) => setPrimaryColor(e.target.value)}
                placeholder={t('administration.workspaces.form.primaryColorPlaceholder', '#3B82F6')}
                className="flex-1 rounded-sm border border-border bg-transparent px-3 py-2 text-sm font-mono outline-none transition-colors focus:border-foreground"
                disabled={isLoading}
              />
              {primaryColor && (
                <div
                  className="h-9 w-9 rounded-sm border border-border"
                  style={{ backgroundColor: primaryColor }}
                />
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-sm border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            disabled={isLoading}
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-sm bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            {mode === 'create'
              ? t('common.create', 'Create')
              : t('common.save', 'Save')}
          </button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
