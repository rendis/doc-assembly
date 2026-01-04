import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { useAppContextStore } from '@/stores/app-context-store'
import { WorkspaceTypeSection } from './WorkspaceTypeSection'
import { MemberManagementSection } from './MemberManagementSection'
import { GlobalInjectablesSection } from './GlobalInjectablesSection'
import { UnsavedChangesAlert } from './UnsavedChangesAlert'

export function SettingsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { currentWorkspace } = useAppContextStore()

  // Form state
  const [workspaceType, setWorkspaceType] = useState<'development' | 'production'>('production')
  const [allowGuestAccess, setAllowGuestAccess] = useState(false)
  const [adminContact, setAdminContact] = useState('admin@doc-assembly.io')
  const [hasChanges, setHasChanges] = useState(false)

  const injectables = [
    { key: 'company_name', value: 'Acme Legal Solutions Inc.' },
    { key: 'disclaimer_footer', value: 'Confidentiality Notice: This document...' },
  ]

  const handleClose = () => {
    if (currentWorkspace) {
      navigate({
        to: '/workspace/$workspaceId',
        params: { workspaceId: currentWorkspace.id } as any,
      })
    }
  }

  const handleReset = () => {
    setWorkspaceType('production')
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
    <div className="flex-1 overflow-y-auto bg-background">
      {/* Header */}
      <header className="sticky left-0 top-0 z-30 w-full border-b border-border bg-background/95 backdrop-blur-sm">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 md:px-6 lg:px-6">
          <div className="flex items-center gap-4">
            <nav className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest">
              <a href="#" className="text-muted-foreground transition-colors hover:text-foreground">
                Hub
              </a>
              <span className="text-muted-foreground/50">/</span>
              <span className="font-semibold text-foreground">Settings</span>
            </nav>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden font-mono text-[10px] uppercase text-muted-foreground md:block">
              v2.4 — Secure
            </div>
            <button
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-accent"
            >
              <X size={20} className="text-muted-foreground" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-20 md:px-6 lg:px-6">
        {/* Title */}
        <div className="mb-16 max-w-3xl md:mb-20">
          <h1 className="mb-6 font-display text-4xl font-light leading-[1.1] tracking-tight text-foreground md:text-5xl lg:text-6xl">
            {t('settings.title', 'Workspace')}
            <br />
            <span className="font-semibold">{t('settings.subtitle', 'Configuration.')}</span>
          </h1>
          <p className="max-w-2xl text-lg font-light leading-relaxed text-muted-foreground md:text-xl">
            {t(
              'settings.description',
              'Manage environment variables, access controls, and injection sources for your document assembly workflows.'
            )}
          </p>
        </div>

        <form className="w-full border-t border-border">
          <WorkspaceTypeSection
            value={workspaceType}
            onChange={(v) => {
              setWorkspaceType(v)
              handleChange()
            }}
          />

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
