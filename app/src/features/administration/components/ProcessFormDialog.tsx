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
import type { Process } from '../api/processes-api'
import { useCreateProcess, useUpdateProcess } from '../hooks/useProcesses'
import { useToast } from '@/components/ui/use-toast'
import axios from 'axios'

interface ProcessFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  process?: Process | null
}

// Validates: alphanumeric segments separated by single underscores
// Valid: CODE, CODE_V2, MY_CODE_123
// Invalid: _CODE, CODE_, __CODE, CODE__V2
const CODE_REGEX = /^[A-Z0-9]+(_[A-Z0-9]+)*$/

const PROCESS_TYPES = ['ID', 'CANONICAL_NAME'] as const

/**
 * Normalizes code input while typing:
 * - Converts to uppercase
 * - Replaces spaces with underscores
 * - Removes special characters (keeps only A-Z, 0-9, _)
 * - Collapses consecutive underscores to one
 * Note: Does NOT remove leading/trailing underscores (allows typing)
 */
function normalizeCodeWhileTyping(value: string): string {
  return value
    .toUpperCase()
    .replace(/\s+/g, '_')
    .replace(/[^A-Z0-9_]/g, '')
    .replace(/_+/g, '_')
}

/**
 * Final cleanup for submission:
 * - Removes leading and trailing underscores
 */
function cleanCodeForSubmit(value: string): string {
  return value.replace(/^_+|_+$/g, '')
}

export function ProcessFormDialog({
  open,
  onOpenChange,
  mode,
  process,
}: ProcessFormDialogProps): React.ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <ProcessFormDialogContent
          onOpenChange={onOpenChange}
          mode={mode}
          process={process}
        />
      )}
    </Dialog>
  )
}

function ProcessFormDialogContent({
  onOpenChange,
  mode,
  process,
}: {
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  process?: Process | null
}): React.ReactElement {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [code, setCode] = useState(mode === 'edit' && process ? process.code : '')
  const [processType, setProcessType] = useState(
    mode === 'edit' && process ? process.processType : 'CANONICAL_NAME'
  )
  const [nameEs, setNameEs] = useState(mode === 'edit' && process ? (process.name?.es || '') : '')
  const [nameEn, setNameEn] = useState(mode === 'edit' && process ? (process.name?.en || '') : '')
  const [descEs, setDescEs] = useState(mode === 'edit' && process ? (process.description?.es || '') : '')
  const [descEn, setDescEn] = useState(mode === 'edit' && process ? (process.description?.en || '') : '')
  const [activeTab, setActiveTab] = useState<'es' | 'en'>('es')
  const [codeError, setCodeError] = useState('')
  const [nameError, setNameError] = useState('')

  const createMutation = useCreateProcess()
  const updateMutation = useUpdateProcess()

  const isLoading = createMutation.isPending || updateMutation.isPending

  const validateForm = (): boolean => {
    let isValid = true

    if (mode === 'create') {
      // Clean code for validation (remove leading/trailing underscores)
      const cleanedCode = cleanCodeForSubmit(code)
      if (!cleanedCode) {
        setCodeError(t('administration.processes.form.codeRequired', 'Code is required'))
        isValid = false
      } else if (cleanedCode.length > 255) {
        setCodeError(t('administration.processes.form.codeTooLong', 'Code must be 255 characters or less'))
        isValid = false
      } else if (!CODE_REGEX.test(cleanedCode)) {
        setCodeError(t('administration.processes.form.codeInvalid', 'Code must contain only letters, numbers, and underscores'))
        isValid = false
      } else {
        setCodeError('')
      }
    }

    if (!nameEs.trim()) {
      setNameError(t('administration.processes.form.nameRequired', 'Spanish name is required'))
      isValid = false
    } else {
      setNameError('')
    }

    return isValid
  }

  // Clean trailing underscores when user leaves the field
  const handleCodeBlur = () => {
    const cleaned = cleanCodeForSubmit(code)
    if (cleaned !== code) {
      setCode(cleaned)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Ensure code is cleaned before validation
    const finalCode = cleanCodeForSubmit(code)
    if (finalCode !== code) {
      setCode(finalCode)
    }

    if (!validateForm()) return

    const name: Record<string, string> = {}
    if (nameEs.trim()) name.es = nameEs.trim()
    if (nameEn.trim()) name.en = nameEn.trim()

    const description: Record<string, string> = {}
    if (descEs.trim()) description.es = descEs.trim()
    if (descEn.trim()) description.en = descEn.trim()

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync({
          code: finalCode,
          processType,
          name,
          description: Object.keys(description).length > 0 ? description : undefined,
        })
        toast({
          title: t('administration.processes.form.createSuccess', 'Process created'),
        })
      } else if (process) {
        await updateMutation.mutateAsync({
          id: process.id,
          data: { name, description },
        })
        toast({
          title: t('administration.processes.form.updateSuccess', 'Process updated'),
        })
      }
      onOpenChange(false)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setCodeError(t('administration.processes.form.codeExists', 'A process with this code already exists'))
      } else {
        toast({
          variant: 'destructive',
          title: t('common.error', 'Error'),
          description: t('administration.processes.form.saveError', 'Failed to save process'),
        })
      }
    }
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>
          {mode === 'create'
            ? t('administration.processes.form.createTitle', 'Create Process')
            : t('administration.processes.form.editTitle', 'Edit Process')}
        </DialogTitle>
        <DialogDescription>
          {mode === 'create'
            ? t('administration.processes.form.createDescription', 'Add a new process to organize templates.')
            : t('administration.processes.form.editDescription', 'Update the process details.')}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Code field - only editable in create mode */}
        {mode === 'create' && (
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t('administration.processes.form.code', 'Code')} *
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => {
                setCode(normalizeCodeWhileTyping(e.target.value))
                setCodeError('')
              }}
              onBlur={handleCodeBlur}
              placeholder={t('administration.processes.form.codePlaceholder', 'PROCESS_CODE')}
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
              {t('administration.processes.form.codeHint', 'Only uppercase letters, numbers, and underscores. Max 255 characters.')}
            </p>
          </div>
        )}

        {/* Code display in edit mode */}
        {mode === 'edit' && process && (
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t('administration.processes.form.code', 'Code')}
            </label>
            <div className="rounded-sm border border-border bg-muted px-3 py-2">
              <span className="font-mono text-sm uppercase">{process.code}</span>
            </div>
          </div>
        )}

        {/* Process Type - editable in create mode, readonly in edit mode */}
        {mode === 'create' && (
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t('administration.processes.form.processType', 'Process Type')} *
            </label>
            <select
              value={processType}
              onChange={(e) => setProcessType(e.target.value)}
              className="w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-foreground"
              disabled={isLoading}
            >
              {PROCESS_TYPES.map((pt) => (
                <option key={pt} value={pt}>
                  {pt}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              {t('administration.processes.form.processTypeHint', 'Determines how the process identifier is interpreted. Cannot be changed after creation.')}
            </p>
          </div>
        )}

        {mode === 'edit' && process && (
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              {t('administration.processes.form.processType', 'Process Type')}
            </label>
            <div className="rounded-sm border border-border bg-muted px-3 py-2">
              <span className="font-mono text-sm">{process.processType}</span>
            </div>
          </div>
        )}

        {/* Language tabs */}
        <div>
          <div className="flex gap-1 border-b border-border">
            <button
              type="button"
              className={cn(
                'px-3 py-2 text-sm transition-colors',
                activeTab === 'es'
                  ? 'border-b-2 border-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setActiveTab('es')}
            >
              Español {!nameEs.trim() && <span className="text-destructive">*</span>}
            </button>
            <button
              type="button"
              className={cn(
                'px-3 py-2 text-sm transition-colors',
                activeTab === 'en'
                  ? 'border-b-2 border-foreground font-medium'
                  : 'text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setActiveTab('en')}
            >
              English
            </button>
          </div>

          {activeTab === 'es' && (
            <div className="space-y-4 pt-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  {t('administration.processes.form.name', 'Name')} *
                </label>
                <input
                  type="text"
                  value={nameEs}
                  onChange={(e) => {
                    setNameEs(e.target.value)
                    setNameError('')
                  }}
                  placeholder={t('administration.processes.form.namePlaceholder', 'Process name')}
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
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  {t('administration.processes.form.description', 'Description')}
                </label>
                <textarea
                  value={descEs}
                  onChange={(e) => setDescEs(e.target.value)}
                  placeholder={t('administration.processes.form.descriptionPlaceholder', 'Optional description')}
                  rows={3}
                  className="w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-foreground"
                  disabled={isLoading}
                />
              </div>
            </div>
          )}

          {activeTab === 'en' && (
            <div className="space-y-4 pt-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  {t('administration.processes.form.name', 'Name')}
                </label>
                <input
                  type="text"
                  value={nameEn}
                  onChange={(e) => setNameEn(e.target.value)}
                  placeholder={t('administration.processes.form.namePlaceholder', 'Process name')}
                  className="w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-foreground"
                  disabled={isLoading}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  {t('administration.processes.form.description', 'Description')}
                </label>
                <textarea
                  value={descEn}
                  onChange={(e) => setDescEn(e.target.value)}
                  placeholder={t('administration.processes.form.descriptionPlaceholder', 'Optional description')}
                  rows={3}
                  className="w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-foreground"
                  disabled={isLoading}
                />
              </div>
            </div>
          )}
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
