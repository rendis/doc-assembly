import { useTranslation } from 'react-i18next'
import { SandboxModeSection } from './SandboxModeSection'

export function SettingsPage() {
  const { t } = useTranslation()

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
        <div className="w-full border-t border-border">
          <SandboxModeSection />
        </div>
      </main>
    </div>
  )
}
