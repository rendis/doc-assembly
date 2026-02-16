import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useTemplates } from '@/features/templates/hooks/useTemplates'
import { useTemplateWithVersions } from '@/features/templates/hooks/useTemplateDetail'
import type { TemplateListItem } from '@/types/api'

interface WizardStepVersionProps {
  templateId: string
  versionId: string
  onTemplateChange: (id: string) => void
  onVersionChange: (id: string) => void
}

export function WizardStepVersion({
  templateId,
  versionId,
  onTemplateChange,
  onVersionChange,
}: WizardStepVersionProps) {
  const { t } = useTranslation()
  const { data: templatesData, isLoading: loadingTemplates } = useTemplates({
    hasPublishedVersion: true,
  })
  const { data: templateDetail, isLoading: loadingVersions } =
    useTemplateWithVersions(templateId)

  const templates: TemplateListItem[] = templatesData?.items ?? []
  const publishedVersions = useMemo(
    () => templateDetail?.versions?.filter((v) => v.status === 'PUBLISHED') ?? [],
    [templateDetail]
  )

  // Auto-select first published version when template changes
  useEffect(() => {
    if (publishedVersions.length > 0 && !versionId) {
      onVersionChange(publishedVersions[0].id)
    }
  }, [publishedVersions, versionId, onVersionChange])

  return (
    <div className="space-y-6">
      {/* Template selector */}
      <div>
        <label
          htmlFor="wizard-template"
          className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground"
        >
          {t('signing.wizard.templateLabel', 'Template')}
        </label>
        <select
          id="wizard-template"
          value={templateId}
          onChange={(e) => {
            onTemplateChange(e.target.value)
            onVersionChange('')
          }}
          disabled={loadingTemplates}
          className="w-full rounded-none border-0 border-b border-border bg-transparent py-2 text-base font-light text-foreground outline-none transition-all focus-visible:border-foreground focus-visible:ring-0 disabled:opacity-50"
        >
          <option value="">
            {loadingTemplates
              ? t('common.loading', 'Loading...')
              : t('signing.wizard.selectTemplate', 'Select a template...')}
          </option>
          {templates.map((tmpl) => (
            <option key={tmpl.id} value={tmpl.id}>
              {tmpl.title}
            </option>
          ))}
        </select>
      </div>

      {/* Version selector */}
      {templateId && (
        <div>
          <label
            htmlFor="wizard-version"
            className="mb-2 block font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground"
          >
            {t('signing.wizard.versionLabel', 'Published Version')}
          </label>
          <select
            id="wizard-version"
            value={versionId}
            onChange={(e) => onVersionChange(e.target.value)}
            disabled={loadingVersions || publishedVersions.length === 0}
            className="w-full rounded-none border-0 border-b border-border bg-transparent py-2 text-base font-light text-foreground outline-none transition-all focus-visible:border-foreground focus-visible:ring-0 disabled:opacity-50"
          >
            <option value="">
              {loadingVersions
                ? t('common.loading', 'Loading...')
                : t('signing.wizard.selectVersion', 'Select a version...')}
            </option>
            {publishedVersions.map((v) => (
              <option key={v.id} value={v.id}>
                v{v.versionNumber} — {v.name}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  )
}
