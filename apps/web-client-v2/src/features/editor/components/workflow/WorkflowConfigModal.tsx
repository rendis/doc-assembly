import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Bell, Settings2, X } from 'lucide-react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'
import { useSignerRolesStore } from '../../stores/signer-roles-store'
import { SigningOrderSelector } from './SigningOrderSelector'
import { NotificationScopeSelector } from './NotificationScopeSelector'
import { NotificationTriggersList } from './NotificationTriggersList'
import { PreviousRolesSelector } from './PreviousRolesSelector'

interface WorkflowConfigModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function WorkflowConfigModal({
  open,
  onOpenChange,
}: WorkflowConfigModalProps) {
  const { t } = useTranslation()
  const [showPreviousRolesSelector, setShowPreviousRolesSelector] =
    useState(false)

  const {
    workflowConfig,
    setOrderMode,
    setNotificationScope,
    updateGlobalTriggers,
    roles,
  } = useSignerRolesStore()
  const { orderMode, notifications } = workflowConfig

  const isGlobalScope = notifications.scope === 'global'

  const handlePreviousRolesChange = (
    mode: 'auto' | 'custom',
    selectedRoleIds: string[]
  ) => {
    updateGlobalTriggers({
      ...notifications.globalTriggers,
      on_previous_roles_signed: {
        ...notifications.globalTriggers.on_previous_roles_signed,
        enabled:
          notifications.globalTriggers.on_previous_roles_signed?.enabled ??
          false,
        previousRolesConfig: { mode, selectedRoleIds },
      },
    })
    setShowPreviousRolesSelector(false)
  }

  const handleSave = () => {
    onOpenChange(false)
  }

  return (
    <>
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            className={cn(
              'fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] border border-border bg-background p-0 shadow-lg duration-200',
              'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
            )}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border p-6">
              <div className="flex items-center gap-2">
                <Settings2 className="h-5 w-5 text-muted-foreground" />
                <DialogPrimitive.Title className="font-mono text-sm font-medium uppercase tracking-widest text-foreground">
                  {t('editor.workflow.title')}
                </DialogPrimitive.Title>
              </div>
              <DialogPrimitive.Close className="text-muted-foreground transition-colors hover:text-foreground">
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>

            {/* Content */}
            <div className="space-y-6 p-6">
              {/* Signing Order Selector */}
              <SigningOrderSelector value={orderMode} onChange={setOrderMode} />

              {/* Notification Scope Selector */}
              <NotificationScopeSelector
                value={notifications.scope}
                onChange={setNotificationScope}
              />

              {/* Global Notification Triggers - CSS Grid height animation */}
              <div
                className="grid transition-[grid-template-rows] duration-200 ease-out"
                style={{ gridTemplateRows: isGlobalScope ? '1fr' : '0fr' }}
              >
                <div className="overflow-hidden">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                        {t('editor.workflow.notifyWhen')}
                      </span>
                    </div>
                    <NotificationTriggersList
                      triggers={notifications.globalTriggers}
                      orderMode={orderMode}
                      onChange={updateGlobalTriggers}
                      roles={roles}
                      onOpenPreviousRolesSelector={() =>
                        setShowPreviousRolesSelector(true)
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Individual mode hint - CSS Grid height animation */}
              <div
                className="grid transition-[grid-template-rows] duration-200 ease-out"
                style={{ gridTemplateRows: !isGlobalScope ? '1fr' : '0fr' }}
              >
                <p className="overflow-hidden text-xs text-muted-foreground italic">
                  {t('editor.workflow.individualHint')}
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-3 border-t border-border p-6">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-none border border-border bg-background px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="rounded-none bg-foreground px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-background transition-colors hover:bg-foreground/90"
              >
                {t('common.save')}
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <PreviousRolesSelector
        open={showPreviousRolesSelector}
        onOpenChange={setShowPreviousRolesSelector}
        roles={roles}
        config={
          notifications.globalTriggers.on_previous_roles_signed
            ?.previousRolesConfig
        }
        onSave={handlePreviousRolesChange}
      />
    </>
  )
}
