import { useState, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { X, Search, FileText, Check, Loader2 } from 'lucide-react'
import {
  Dialog,
  BaseDialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { usePromoteVersion, useProductionTemplates } from '../hooks/usePromoteVersion'
import type { TemplateVersionSummaryResponse } from '@/types/api'
import type { PromotionMode, PromoteVersionResponse } from '../api/templates-api'
import { cn } from '@/lib/utils'
import { useToast } from '@/components/ui/use-toast'
import { getApiErrorMessage } from '@/lib/api-client'

interface PromoteVersionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  version: TemplateVersionSummaryResponse | null
  templateId: string
  onSuccess: (response: PromoteVersionResponse) => void
}

export function PromoteVersionDialog({
  open,
  onOpenChange,
  version,
  templateId,
  onSuccess,
}: PromoteVersionDialogProps) {
  const { t } = useTranslation()
  const { toast } = useToast()

  // Form state
  const [mode, setMode] = useState<PromotionMode>('NEW_TEMPLATE')
  const [templateName, setTemplateName] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [versionName, setVersionName] = useState('')

  // API hooks
  const promoteVersion = usePromoteVersion(templateId)
  const { data: searchResults, isLoading: isSearching } = useProductionTemplates(searchQuery)

  // Debounced search handler
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value)
    setSelectedTemplateId(null)
  }, [])

  // Reset form when dialog opens
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      if (isOpen && version) {
        setMode('NEW_TEMPLATE')
        setTemplateName('')
        setSelectedTemplateId(null)
        setSearchQuery('')
        setVersionName(version.name)
      }
      onOpenChange(isOpen)
    },
    [onOpenChange, version]
  )

  // Form validation
  const isValid = useMemo(() => {
    if (mode === 'NEW_TEMPLATE') {
      return templateName.trim().length > 0
    }
    return selectedTemplateId !== null
  }, [mode, templateName, selectedTemplateId])

  // Submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!version || !isValid || promoteVersion.isPending) return

    try {
      const response = await promoteVersion.mutateAsync({
        versionId: version.id,
        request: {
          mode,
          targetTemplateId: mode === 'NEW_VERSION' ? selectedTemplateId ?? undefined : undefined,
          versionName: versionName.trim() || undefined,
        },
      })

      toast({
        title: t('templates.promoteDialog.success', 'Version promoted successfully'),
        description:
          mode === 'NEW_TEMPLATE'
            ? t('templates.promoteDialog.successNewTemplate', 'New template created in production')
            : t('templates.promoteDialog.successNewVersion', 'New version added to template'),
      })

      onSuccess(response)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error', 'Error'),
        description: getApiErrorMessage(error),
      })
    }
  }

  if (!version) return null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <BaseDialogContent className="max-w-lg">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border p-6">
          <div>
            <DialogTitle className="font-mono text-sm font-medium uppercase tracking-widest text-foreground">
              {t('templates.promoteDialog.title', 'Promote to Production')}
            </DialogTitle>
            <DialogDescription className="mt-1 text-sm font-light text-muted-foreground">
              {t('templates.promoteDialog.description', 'Promote version "{{name}}" to production', {
                name: version.name,
              })}
            </DialogDescription>
          </div>
          <DialogClose className="text-muted-foreground transition-colors hover:text-foreground">
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </DialogClose>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-6 p-6">
            {/* Mode selection */}
            <div className="space-y-3">
              {/* New Template option */}
              <button
                type="button"
                onClick={() => setMode('NEW_TEMPLATE')}
                className={cn(
                  'flex w-full items-start gap-3 border p-4 text-left transition-colors',
                  mode === 'NEW_TEMPLATE'
                    ? 'border-foreground bg-accent'
                    : 'border-border hover:border-foreground/50'
                )}
              >
                <div
                  className={cn(
                    'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                    mode === 'NEW_TEMPLATE'
                      ? 'border-foreground bg-foreground'
                      : 'border-muted-foreground'
                  )}
                >
                  {mode === 'NEW_TEMPLATE' && (
                    <div className="h-1.5 w-1.5 rounded-full bg-background" />
                  )}
                </div>
                <div>
                  <span className="font-medium text-foreground">
                    {t('templates.promoteDialog.modeNewTemplate', 'New Template')}
                  </span>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {t(
                      'templates.promoteDialog.modeNewTemplateDesc',
                      'Create a new template with this version'
                    )}
                  </p>
                </div>
              </button>

              {/* Existing Template option */}
              <button
                type="button"
                onClick={() => setMode('NEW_VERSION')}
                className={cn(
                  'flex w-full items-start gap-3 border p-4 text-left transition-colors',
                  mode === 'NEW_VERSION'
                    ? 'border-foreground bg-accent'
                    : 'border-border hover:border-foreground/50'
                )}
              >
                <div
                  className={cn(
                    'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                    mode === 'NEW_VERSION'
                      ? 'border-foreground bg-foreground'
                      : 'border-muted-foreground'
                  )}
                >
                  {mode === 'NEW_VERSION' && (
                    <div className="h-1.5 w-1.5 rounded-full bg-background" />
                  )}
                </div>
                <div>
                  <span className="font-medium text-foreground">
                    {t('templates.promoteDialog.modeExistingTemplate', 'Existing Template')}
                  </span>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {t(
                      'templates.promoteDialog.modeExistingTemplateDesc',
                      'Add as new version to existing template'
                    )}
                  </p>
                </div>
              </button>
            </div>

            {/* Conditional fields based on mode */}
            {mode === 'NEW_TEMPLATE' ? (
              // Template Name field for NEW_TEMPLATE mode
              <div>
                <label
                  htmlFor="template-name"
                  className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground"
                >
                  {t('templates.promoteDialog.templateName', 'Template Name')}
                </label>
                <input
                  id="template-name"
                  type="text"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  placeholder={t(
                    'templates.promoteDialog.templateNamePlaceholder',
                    'Enter template name'
                  )}
                  maxLength={200}
                  autoFocus
                  className="w-full rounded-none border-0 border-b border-border bg-transparent py-2 text-base font-light text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-foreground focus:ring-0"
                />
              </div>
            ) : (
              // Target Template search for NEW_VERSION mode
              <div>
                <label
                  htmlFor="target-template"
                  className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground"
                >
                  {t('templates.promoteDialog.targetTemplate', 'Target Template')}
                </label>
                <div className="relative">
                  <Search className="absolute left-0 top-2.5 h-4 w-4 text-muted-foreground" />
                  <input
                    id="target-template"
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    placeholder={t(
                      'templates.promoteDialog.searchPlaceholder',
                      'Search templates...'
                    )}
                    autoFocus
                    className="w-full rounded-none border-0 border-b border-border bg-transparent py-2 pl-6 text-base font-light text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-foreground focus:ring-0"
                  />
                  {isSearching && (
                    <Loader2 className="absolute right-0 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>

                {/* Search results */}
                {searchQuery && (
                  <div className="mt-3 max-h-48 overflow-y-auto border border-border">
                    {searchResults?.items && searchResults.items.length > 0 ? (
                      searchResults.items.map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => setSelectedTemplateId(template.id)}
                          className={cn(
                            'flex w-full items-center gap-3 border-b border-border px-3 py-2.5 text-left transition-colors last:border-b-0',
                            selectedTemplateId === template.id
                              ? 'bg-accent'
                              : 'hover:bg-accent/50'
                          )}
                        >
                          <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <span className="flex-1 truncate text-sm text-foreground">
                            {template.title}
                          </span>
                          {selectedTemplateId === template.id && (
                            <Check className="h-4 w-4 shrink-0 text-foreground" />
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                        {t('templates.promoteDialog.noTemplatesFound', 'No templates found')}
                      </div>
                    )}
                  </div>
                )}

                {!searchQuery && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t('templates.promoteDialog.selectTemplate', 'Search and select a template')}
                  </p>
                )}
              </div>
            )}

            {/* Version Name field (common for both modes) */}
            <div>
              <label
                htmlFor="version-name"
                className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground"
              >
                {t('templates.promoteDialog.versionName', 'Version Name')}
              </label>
              <input
                id="version-name"
                type="text"
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
                placeholder={t(
                  'templates.promoteDialog.versionNamePlaceholder',
                  'Enter version name'
                )}
                maxLength={100}
                className="w-full rounded-none border-0 border-b border-border bg-transparent py-2 text-base font-light text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus:border-foreground focus:ring-0"
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-border p-6">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              disabled={promoteVersion.isPending}
              className="rounded-none border border-border bg-background px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              type="submit"
              disabled={!isValid || promoteVersion.isPending}
              className="rounded-none bg-foreground px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
            >
              {promoteVersion.isPending
                ? t('templates.promoteDialog.promoting', 'Promoting...')
                : t('templates.promoteDialog.promote', 'Promote')}
            </button>
          </div>
        </form>
      </BaseDialogContent>
    </Dialog>
  )
}
