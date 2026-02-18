import { useAppContextStore } from '@/stores/app-context-store'
import { useSandboxMode, useSandboxModeStore } from '@/stores/sandbox-mode-store'
import { useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from '@tanstack/react-router'
import { AlertTriangle, FlaskConical } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { SandboxConfirmDialog } from './SandboxConfirmDialog'

export function SandboxModeSection() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { currentWorkspace } = useAppContextStore()
  const clearSandboxForWorkspace = useSandboxModeStore((state) => state.clearSandboxForWorkspace)
  const { isSandboxActive, enableSandbox, disableSandbox } = useSandboxMode()
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingAction, setPendingAction] = useState<'enable' | 'disable' | null>(null)
  // Pending checked value while dialog is open (null = use actual value)
  const [pendingChecked, setPendingChecked] = useState<boolean | null>(null)
  const isSandboxSupported = currentWorkspace?.type === 'CLIENT'

  useEffect(() => {
    if (!currentWorkspace?.id || isSandboxSupported) return
    clearSandboxForWorkspace(currentWorkspace.id)
  }, [clearSandboxForWorkspace, currentWorkspace?.id, isSandboxSupported])

  // Use pending value if set (dialog open), otherwise use actual sandbox state
  const localChecked = pendingChecked ?? isSandboxActive

  if (!isSandboxSupported) {
    return null
  }

  const handleToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.checked
    setPendingChecked(newValue) // Update UI immediately
    if (newValue) {
      // Entering sandbox - show confirmation
      setPendingAction('enable')
      setShowConfirmDialog(true)
    } else {
      // Exiting sandbox - show confirmation
      setPendingAction('disable')
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
    setPendingChecked(null)
  }

  const handleDialogClose = (open: boolean) => {
    if (!open) {
      // User cancelled - revert to actual state
      setPendingChecked(null)
      setShowConfirmDialog(false)
      setPendingAction(null)
    } else {
      setShowConfirmDialog(open)
    }
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
            <label className="relative inline-flex cursor-pointer items-center">
              <input
                type="checkbox"
                checked={localChecked}
                onChange={handleToggle}
                className="peer sr-only"
              />
              <div className="h-8 w-14 rounded-none border border-border bg-muted transition-colors duration-300 peer-checked:border-foreground peer-checked:bg-foreground" />
              <div className="absolute left-1 top-1 h-6 w-6 border border-border bg-background transition-transform duration-300 peer-checked:translate-x-6 peer-checked:border-foreground" />
            </label>
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
        onOpenChange={handleDialogClose}
        action={pendingAction}
        onConfirm={handleConfirm}
      />
    </>
  )
}
