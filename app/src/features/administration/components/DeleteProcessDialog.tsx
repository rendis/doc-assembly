import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { AlertTriangle, Loader2, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { Process, ProcessTemplateInfo } from '../api/processes-api'
import { useDeleteProcess, useProcesses } from '../hooks/useProcesses'
import { useToast } from '@/components/ui/use-toast'

interface DeleteProcessDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  process: Process | null
}

function getLocalizedName(name: Record<string, string>, locale: string): string {
  return name[locale] || name['es'] || name['en'] || Object.values(name)[0] || ''
}

// The DEFAULT process (code "default") cannot be deleted.
const DEFAULT_PROCESS_CODE = 'default'

export function DeleteProcessDialog({
  open,
  onOpenChange,
  process,
}: DeleteProcessDialogProps): React.ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && process && (
        <DeleteProcessDialogContent
          onOpenChange={onOpenChange}
          process={process}
        />
      )}
    </Dialog>
  )
}

function DeleteProcessDialogContent({
  onOpenChange,
  process,
}: {
  onOpenChange: (open: boolean) => void
  process: Process
}): React.ReactElement {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()

  const [step, setStep] = useState<'confirm' | 'templates'>('confirm')
  const [templates, setTemplates] = useState<ProcessTemplateInfo[]>([])
  const [action, setAction] = useState<'force' | 'replace' | null>(null)
  const [replacementCode, setReplacementCode] = useState('')

  const deleteMutation = useDeleteProcess()
  const { data: processesData } = useProcesses(1, 100)

  const isLoading = deleteMutation.isPending

  const isDefaultProcess = process.code.toLowerCase() === DEFAULT_PROCESS_CODE

  // Get other processes for replacement selector (exclude current and global)
  const otherProcesses = processesData?.data.filter(
    (p) => p.id !== process.id
  ) ?? []

  const displayName = getLocalizedName(process.name, i18n.language)

  // DEFAULT process cannot be deleted
  if (isDefaultProcess) {
    return (
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('administration.processes.delete.title', 'Delete Process')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'administration.processes.delete.cannotDeleteDefault',
              'The DEFAULT process cannot be deleted.'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 rounded-sm border border-destructive/30 bg-destructive/5 p-3">
          <ShieldAlert size={20} className="shrink-0 text-destructive" />
          <p className="text-sm text-destructive">
            {t(
              'administration.processes.delete.defaultProtected',
              'The "{{name}}" process is the system default and is protected from deletion.',
              { name: displayName }
            )}
          </p>
        </div>

        <DialogFooter>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-sm border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
          >
            {t('common.close', 'Close')}
          </button>
        </DialogFooter>
      </DialogContent>
    )
  }

  const handleDelete = async () => {
    try {
      if (step === 'confirm') {
        // First attempt - no options
        const result = await deleteMutation.mutateAsync({
          id: process.id,
        })

        if (result.deleted) {
          toast({
            title: t('administration.processes.delete.success', 'Process deleted'),
          })
          onOpenChange(false)
        } else {
          // Has templates - show templates step
          setTemplates(result.templates ?? [])
          setStep('templates')
        }
      } else if (step === 'templates') {
        // Second attempt with options
        if (!action) return

        const options = action === 'force'
          ? { force: true }
          : { replaceWithCode: replacementCode }

        const result = await deleteMutation.mutateAsync({
          id: process.id,
          options,
        })

        if (result.deleted) {
          toast({
            title: t('administration.processes.delete.success', 'Process deleted'),
          })
          onOpenChange(false)
        }
      }
    } catch {
      toast({
        variant: 'destructive',
        title: t('common.error', 'Error'),
        description: t('administration.processes.delete.error', 'Failed to delete process'),
      })
    }
  }

  const canConfirm = step === 'confirm' || (
    step === 'templates' && (
      action === 'force' ||
      (action === 'replace' && replacementCode)
    )
  )

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>
          {t('administration.processes.delete.title', 'Delete Process')}
        </DialogTitle>
        <DialogDescription>
          {step === 'confirm'
            ? t(
                'administration.processes.delete.confirm',
                'Are you sure you want to delete "{{name}}"?',
                { name: displayName }
              )
            : t(
                'administration.processes.delete.hasTemplatesDescription',
                'This process is being used. Choose how to proceed.'
              )}
        </DialogDescription>
      </DialogHeader>

      {step === 'templates' && (
        <div className="space-y-4">
          {/* Warning */}
          <div className="flex gap-3 rounded-sm border border-warning-border bg-warning-muted p-3">
            <AlertTriangle size={20} className="shrink-0 text-warning-foreground" />
            <p className="text-sm text-warning-foreground">
              {t(
                'administration.processes.delete.hasTemplates',
                'This process is used by {{count}} template(s)',
                { count: templates.length }
              )}
            </p>
          </div>

          {/* Templates list */}
          <div className="max-h-40 overflow-y-auto rounded-sm border border-border">
            {templates.map((template) => (
              <div
                key={template.id}
                className="border-b border-border px-3 py-2 last:border-0"
              >
                <span className="text-sm font-medium">{template.title}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  ({template.workspaceName})
                </span>
              </div>
            ))}
          </div>

          {/* Action selection */}
          <div className="space-y-3">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="radio"
                name="deleteAction"
                checked={action === 'force'}
                onChange={() => setAction('force')}
                className="mt-0.5"
                disabled={isLoading}
              />
              <div>
                <span className="text-sm font-medium">
                  {t('administration.processes.delete.forceOption', 'Reset templates to DEFAULT process')}
                </span>
                <p className="text-xs text-muted-foreground">
                  {t('administration.processes.delete.forceHint', 'Templates will be reassigned to the default process')}
                </p>
              </div>
            </label>

            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="radio"
                name="deleteAction"
                checked={action === 'replace'}
                onChange={() => setAction('replace')}
                className="mt-0.5"
                disabled={isLoading || otherProcesses.length === 0}
              />
              <div className="flex-1">
                <span className={cn(
                  'text-sm font-medium',
                  otherProcesses.length === 0 && 'text-muted-foreground'
                )}>
                  {t('administration.processes.delete.replaceOption', 'Replace with another process')}
                </span>
                {otherProcesses.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {t('administration.processes.delete.noOtherProcesses', 'No other processes available')}
                  </p>
                )}
              </div>
            </label>

            {action === 'replace' && otherProcesses.length > 0 && (
              <select
                value={replacementCode}
                onChange={(e) => setReplacementCode(e.target.value)}
                className="ml-6 w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm outline-none focus:border-foreground"
                disabled={isLoading}
              >
                <option value="">
                  {t('administration.processes.delete.selectReplacement', 'Select replacement process...')}
                </option>
                {otherProcesses.map((p) => (
                  <option key={p.id} value={p.code}>
                    {getLocalizedName(p.name, i18n.language)} ({p.code})
                  </option>
                ))}
              </select>
            )}
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
          type="button"
          onClick={handleDelete}
          className="inline-flex items-center gap-2 rounded-sm bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
          disabled={isLoading || !canConfirm}
        >
          {isLoading && <Loader2 size={16} className="animate-spin" />}
          {t('common.delete', 'Delete')}
        </button>
      </DialogFooter>
    </DialogContent>
  )
}
