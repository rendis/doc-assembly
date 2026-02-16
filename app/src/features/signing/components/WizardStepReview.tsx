import { useTranslation } from 'react-i18next'
import type { TemplateVersionSummaryResponse } from '@/types/api'
import type { DocumentRecipientCommand } from '../types'

interface WizardStepReviewProps {
  templateTitle: string
  version: TemplateVersionSummaryResponse | null
  title: string
  values: Record<string, unknown>
  recipients: DocumentRecipientCommand[]
  signerRoleNames: Record<string, string>
}

export function WizardStepReview({
  templateTitle,
  version,
  title,
  values,
  recipients,
  signerRoleNames,
}: WizardStepReviewProps) {
  const { t } = useTranslation()

  const valueEntries = Object.entries(values).filter(
    ([, v]) => v !== '' && v !== undefined && v !== null
  )

  return (
    <div className="space-y-6">
      {/* Document info */}
      <div>
        <h4 className="mb-2 font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
          {t('signing.wizard.reviewDocument', 'Document')}
        </h4>
        <div className="space-y-1 text-sm">
          <div>
            <span className="text-muted-foreground">
              {t('signing.wizard.reviewTitle', 'Title')}:{' '}
            </span>
            <span className="font-medium">{title}</span>
          </div>
          <div>
            <span className="text-muted-foreground">
              {t('signing.wizard.reviewTemplate', 'Template')}:{' '}
            </span>
            <span>{templateTitle}</span>
          </div>
          {version && (
            <div>
              <span className="text-muted-foreground">
                {t('signing.wizard.reviewVersion', 'Version')}:{' '}
              </span>
              <span>
                v{version.versionNumber} — {version.name}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Injected values */}
      {valueEntries.length > 0 && (
        <div>
          <h4 className="mb-2 font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            {t('signing.wizard.reviewValues', 'Injected Values')}
          </h4>
          <div className="space-y-1 text-sm">
            {valueEntries.map(([key, val]) => (
              <div key={key}>
                <span className="text-muted-foreground">{key}: </span>
                <span>{String(val)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recipients */}
      {recipients.length > 0 && (
        <div>
          <h4 className="mb-2 font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            {t('signing.wizard.reviewRecipients', 'Recipients')}
          </h4>
          <div className="space-y-2">
            {recipients.map((r) => (
              <div
                key={r.roleId}
                className="flex items-center gap-3 border-b border-border/50 pb-2 text-sm last:border-b-0"
              >
                <span className="font-mono text-xs text-muted-foreground uppercase">
                  {signerRoleNames[r.roleId] ?? r.roleId}
                </span>
                <span className="font-medium">{r.name}</span>
                <span className="text-muted-foreground">{r.email}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
