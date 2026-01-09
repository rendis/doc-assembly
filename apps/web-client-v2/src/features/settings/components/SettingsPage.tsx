import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SandboxModeSection } from './SandboxModeSection'
import { MemberManagementSection } from './MemberManagementSection'
import { GlobalInjectablesSection } from './GlobalInjectablesSection'
import { UnsavedChangesAlert } from './UnsavedChangesAlert'

export function SettingsPage() {
  const { t } = useTranslation()

  // Form state
  const [allowGuestAccess, setAllowGuestAccess] = useState(false)
  const [adminContact, setAdminContact] = useState('admin@doc-assembly.io')
  const [hasChanges, setHasChanges] = useState(false)

  const injectables = [
    { key: 'company_name', value: 'Acme Legal Solutions Inc.' },
    { key: 'disclaimer_footer', value: 'Confidentiality Notice: This document...' },
  ]

  const handleReset = () => {
    setAllowGuestAccess(false)
    setAdminContact('admin@doc-assembly.io')
    setHasChanges(false)
  }

  const handleApply = () => {
    // Save settings
    setHasChanges(false)
  }

  const handleChange = () => {
    setHasChanges(true)
  }

  return (
    <div className="animate-page-enter flex-1 overflow-y-auto bg-background">
      {/* Header */}
      <header className="shrink-0 px-4 pb-6 pt-12 md:px-6 lg:px-6">
        <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div>
            <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {t('settings.header', 'Configuration')}
            </div>
            <h1 className="font-display text-4xl font-light leading-tight tracking-tight text-foreground md:text-5xl">
              {t('settings.title', 'Workspace Settings')}
            </h1>
          </div>
        </div>
      </header>

      <main className="w-full px-4 pb-24 md:px-6 lg:px-6">
        <form className="w-full border-t border-border">
          <SandboxModeSection />

          <MemberManagementSection
            allowGuestAccess={allowGuestAccess}
            onGuestAccessChange={(v) => {
              setAllowGuestAccess(v)
              handleChange()
            }}
            adminContact={adminContact}
            onAdminContactChange={(v) => {
              setAdminContact(v)
              handleChange()
            }}
          />

          <GlobalInjectablesSection
            injectables={injectables}
            onEdit={(key) => console.log('Edit', key)}
            onAdd={() => console.log('Add new injectable')}
          />

          <UnsavedChangesAlert
            hasChanges={hasChanges}
            onReset={handleReset}
            onApply={handleApply}
          />
        </form>
      </main>
    </div>
  )
}
