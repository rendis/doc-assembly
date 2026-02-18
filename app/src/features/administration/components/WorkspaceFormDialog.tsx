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
import type { Workspace } from '@/features/workspaces/types'
import {
  useCreateWorkspace,
  useUpdateWorkspace,
} from '@/features/workspaces/hooks/useWorkspaces'
import { useToast } from '@/components/ui/use-toast'
import { useAppContextStore } from '@/stores/app-context-store'
import axios from 'axios'

interface WorkspaceFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  workspace?: Workspace | null
}

// Validates: alphanumeric segments separated by single underscores
const CODE_REGEX = /^[A-Z0-9]+(_[A-Z0-9]+)*$/

function normalizeCodeWhileTyping(value: string): string {
  return value
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '')
    .replace(/_+/g, '_')
}

function cleanCodeForSubmit(value: string): string {
  return value.replace(/^_+|_+$/g, '')
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
  const [code, setCode] = useState(mode === 'edit' && workspace ? workspace.code : '')
  const [nameError, setNameError] = useState('')
  const [codeError, setCodeError] = useState('')

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

    if (mode === 'create') {
      const cleanedCode = cleanCodeForSubmit(code)
      if (!cleanedCode) {
        setCodeError(t('administration.workspaces.form.codeRequired', 'Code is required'))
        isValid = false
      } else if (cleanedCode.length < 2 || cleanedCode.length > 50) {
        setCodeError(t('administration.workspaces.form.codeLength', 'Code must be 2-50 characters'))
        isValid = false
      } else if (!CODE_REGEX.test(cleanedCode)) {
        setCodeError(t('administration.workspaces.form.codeInvalid', 'Code must contain only letters, numbers, and underscores'))
        isValid = false
      } else {
        setCodeError('')
      }
    }

    return isValid
  }

  const handleCodeBlur = () => {
    const cleaned = cleanCodeForSubmit(code)
    if (cleaned !== code) {
      setCode(cleaned)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const finalCode = cleanCodeForSubmit(code)
    if (finalCode !== code) {
      setCode(finalCode)
    }

    if (!validateForm()) return

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync({
          name: name.trim(),
          code: finalCode,
          type: 'CLIENT',
        })
        toast({
          title: t('administration.workspaces.form.createSuccess', 'Workspace created'),
        })
      } else if (workspace) {
        if (currentWorkspace?.id === workspace.id) {
          await updateMutation.mutateAsync({
            name: name.trim(),
          })
          toast({
            title: t('administration.workspaces.form.updateSuccess', 'Workspace updated'),
          })
        } else {
          toast({
            variant: 'destructive',
            title: t('common.error', 'Error'),
            description: t('administration.workspaces.form.editContextError', 'Cannot edit workspace outside its context'),
          })
          return
        }
      }
      onOpenChange(false)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setCodeError(t('administration.workspaces.form.codeExists', 'A workspace with this code already exists'))
      } else {
        toast({
          variant: 'destructive',
          title: t('common.error', 'Error'),
          description: t('administration.workspaces.form.saveError', 'Failed to save workspace'),
        })
      }
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

        {/* Code field - editable in create mode */}
        {mode === 'create' && (
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t('administration.workspaces.form.code', 'Code')} *
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(normalizeCodeWhileTyping(e.target.value))
                setCodeError('')
              }}
              onBlur={handleCodeBlur}
              placeholder={t('administration.workspaces.form.codePlaceholder', 'WORKSPACE_CODE')}
              className={cn(
                'w-full rounded-sm border bg-transparent px-3 py-2 text-sm font-mono uppercase outline-none transition-colors focus:border-foreground',
                codeError ? 'border-destructive' : 'border-border'
              )}
              disabled={isLoading}
            />
            {codeError && (
              <p className="mt-1 text-xs text-destructive">{codeError}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              {t('administration.workspaces.form.codeHint', '2-50 uppercase characters')}
            </p>
          </div>
        )}

        {/* Code display in edit mode */}
        {mode === 'edit' && workspace && (
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t('administration.workspaces.form.code', 'Code')}
            </label>
            <div className="rounded-sm border border-border bg-muted px-3 py-2">
              <span className="font-mono text-sm uppercase">{workspace.code}</span>
            </div>
          </div>
        )}

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
