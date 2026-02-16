import { useTranslation } from 'react-i18next'
import type { SignerRole } from '@/types/api'
import type { DocumentRecipientCommand } from '../types'

interface WizardStepRecipientsProps {
  signerRoles: SignerRole[]
  recipients: DocumentRecipientCommand[]
  onRecipientsChange: (recipients: DocumentRecipientCommand[]) => void
}

export function WizardStepRecipients({
  signerRoles,
  recipients,
  onRecipientsChange,
}: WizardStepRecipientsProps) {
  const { t } = useTranslation()

  if (signerRoles.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        {t(
          'signing.wizard.noSignerRoles',
          'This template version has no signer roles defined.'
        )}
      </p>
    )
  }

  const handleFieldChange = (
    roleId: string,
    field: 'name' | 'email',
    value: string
  ) => {
    const updated = recipients.map((r) =>
      r.roleId === roleId ? { ...r, [field]: value } : r
    )
    onRecipientsChange(updated)
  }

  return (
    <div className="space-y-6">
      {signerRoles
        .sort((a, b) => a.signerOrder - b.signerOrder)
        .map((role) => {
          const recipient = recipients.find((r) => r.roleId === role.id)
          return (
            <div
              key={role.id}
              className="border-b border-border pb-5 last:border-b-0 last:pb-0"
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center bg-muted font-mono text-xs font-medium">
                  {role.signerOrder}
                </span>
                <span className="font-mono text-sm font-medium uppercase tracking-wider">
                  {role.roleName}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor={`recipient-name-${role.id}`}
                    className="mb-1 block font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground"
                  >
                    {t('signing.wizard.recipientName', 'Full Name')}
                    <span className="ml-1 text-destructive">*</span>
                  </label>
                  <input
                    id={`recipient-name-${role.id}`}
                    type="text"
                    value={recipient?.name ?? ''}
                    onChange={(e) =>
                      handleFieldChange(role.id, 'name', e.target.value)
                    }
                    required
                    placeholder={t(
                      'signing.wizard.recipientNamePlaceholder',
                      'John Doe'
                    )}
                    className="w-full rounded-none border-0 border-b border-border bg-transparent py-2 text-sm font-light text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus-visible:border-foreground focus-visible:ring-0"
                  />
                </div>
                <div>
                  <label
                    htmlFor={`recipient-email-${role.id}`}
                    className="mb-1 block font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground"
                  >
                    {t('signing.wizard.recipientEmail', 'Email')}
                    <span className="ml-1 text-destructive">*</span>
                  </label>
                  <input
                    id={`recipient-email-${role.id}`}
                    type="email"
                    value={recipient?.email ?? ''}
                    onChange={(e) =>
                      handleFieldChange(role.id, 'email', e.target.value)
                    }
                    required
                    placeholder={t(
                      'signing.wizard.recipientEmailPlaceholder',
                      'john@example.com'
                    )}
                    className="w-full rounded-none border-0 border-b border-border bg-transparent py-2 text-sm font-light text-foreground outline-none transition-all placeholder:text-muted-foreground/50 focus-visible:border-foreground focus-visible:ring-0"
                  />
                </div>
              </div>
            </div>
          )
        })}
    </div>
  )
}
