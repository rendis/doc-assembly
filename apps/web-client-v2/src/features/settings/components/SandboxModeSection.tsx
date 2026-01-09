import { useState } from 'react'
import { FlaskConical, AlertTriangle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useLocation } from '@tanstack/react-router'
import { Switch } from '@/components/ui/switch'
import { useSandboxMode } from '@/stores/sandbox-mode-store'
import { useAppContextStore } from '@/stores/app-context-store'
import { useQueryClient } from '@tanstack/react-query'
import { SandboxConfirmDialog } from './SandboxConfirmDialog'

export function SandboxModeSection() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { currentWorkspace } = useAppContextStore()
  const { isSandboxActive, enableSandbox, disableSandbox } = useSandboxMode()
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingAction, setPendingAction] = useState<'enable' | 'disable' | null>(null)

  const handleToggle = () => {
    if (isSandboxActive) {
      // Exiting sandbox - show confirmation
      setPendingAction('disable')
      setShowConfirmDialog(true)
    } else {
      // Entering sandbox - show confirmation
      setPendingAction('enable')
      setShowConfirmDialog(true)
    }
  }

  const handleConfirm = () => {
    if (pendingAction === 'enable') {
      enableSandbox()

      // Invalidate queries to refetch with sandbox header
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })

      // Redirect to templates if currently on dashboard or settings
      const workspaceId = currentWorkspace?.id
      if (workspaceId) {
        const currentPath = location.pathname
        const isOnDashboard =
          currentPath === `/workspace/${workspaceId}` ||
          currentPath === `/workspace/${workspaceId}/`
        const isOnSettings = currentPath.includes('/settings')

        if (isOnDashboard || isOnSettings) {
          navigate({ to: '/workspace/$workspaceId/templates', params: { workspaceId } })
        }
      }
    } else {
      disableSandbox()

      // Invalidate queries to refetch without sandbox header
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      queryClient.invalidateQueries({ queryKey: ['folders'] })

      // Redirect to section root if on a detail/editor/folder route (sandbox data won't exist in production)
      const workspaceId = currentWorkspace?.id
      if (workspaceId) {
        const templatesBase = `/workspace/${workspaceId}/templates`
        const documentsBase = `/workspace/${workspaceId}/documents`
        const searchParams = location.search as Record<string, unknown>
        const hasFolder = 'folderId' in searchParams

        const isOnTemplatesDetail = location.pathname.startsWith(templatesBase) && location.pathname !== templatesBase
        const isOnDocumentsDetail = location.pathname.startsWith(documentsBase) && location.pathname !== documentsBase
        const isOnTemplates = location.pathname.startsWith(templatesBase)
        const isOnDocuments = location.pathname.startsWith(documentsBase)

        if (isOnTemplatesDetail || (isOnTemplates && hasFolder)) {
          navigate({ to: '/workspace/$workspaceId/templates', params: { workspaceId } })
        } else if (isOnDocumentsDetail || (isOnDocuments && hasFolder)) {
          navigate({ to: '/workspace/$workspaceId/documents', params: { workspaceId } })
        }
      }
    }

    setShowConfirmDialog(false)
    setPendingAction(null)
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-8 border-b border-border py-12 lg:grid-cols-12">
        <div className="pr-8 lg:col-span-4">
          <div className="mb-2 flex items-center gap-2">
            <FlaskConical size={20} className="text-sandbox" />
            <h3 className="font-display text-xl font-medium text-foreground">
              {t('settings.sandbox.title', 'Sandbox Mode')}
            </h3>
          </div>
          <p className="font-mono text-xs uppercase leading-relaxed tracking-widest text-muted-foreground">
            {t(
              'settings.sandbox.description',
              'Test templates and documents in an isolated environment without affecting production data.'
            )}
          </p>
        </div>

        <div className="space-y-6 lg:col-span-8">
          <div className="flex items-center justify-between border border-border p-5">
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                <span className="font-display text-lg font-bold">
                  {isSandboxActive
                    ? t('settings.sandbox.active', 'Sandbox Active')
                    : t('settings.sandbox.inactive', 'Production Mode')}
                </span>
              </div>
              <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
                {isSandboxActive
                  ? t(
                      'settings.sandbox.activeDesc',
                      'Changes are isolated and will not affect production'
                    )
                  : t(
                      'settings.sandbox.inactiveDesc',
                      'All changes will be applied to production data'
                    )}
              </p>
            </div>
            <Switch
              checked={isSandboxActive}
              onCheckedChange={handleToggle}
              className="data-[state=checked]:bg-sandbox"
            />
          </div>

          {/* Warning notice */}
          <div className="flex gap-3 border border-warning-border bg-warning-muted p-4">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warning" />
            <p className="font-mono text-xs leading-relaxed text-warning-foreground">
              {t(
                'settings.sandbox.warning',
                'Sandbox data is workspace-specific and may be reset periodically. Use production mode for permanent changes.'
              )}
            </p>
          </div>
        </div>
      </div>

      <SandboxConfirmDialog
        open={showConfirmDialog}
        onOpenChange={setShowConfirmDialog}
        action={pendingAction}
        onConfirm={handleConfirm}
      />
    </>
  )
}
