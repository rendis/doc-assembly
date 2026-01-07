import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'
import type {
  SignerRoleDefinition,
  NotificationTriggerMap,
  SigningOrderMode,
} from '../../types/signer-roles'
import { NotificationTriggersList } from './NotificationTriggersList'
import { PreviousRolesSelector } from './PreviousRolesSelector'

interface NotificationConfigDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: SignerRoleDefinition
  allRoles: SignerRoleDefinition[]
  triggers: NotificationTriggerMap
  orderMode: SigningOrderMode
  onSave: (triggers: NotificationTriggerMap) => void
}

export function NotificationConfigDialog({
  open,
  onOpenChange,
  role,
  allRoles,
  triggers,
  orderMode,
  onSave,
}: NotificationConfigDialogProps) {
  const { t } = useTranslation()
  const [localTriggers, setLocalTriggers] =
    useState<NotificationTriggerMap>(triggers)
  const [showPreviousRolesSelector, setShowPreviousRolesSelector] =
    useState(false)

  // Reset local state when dialog opens
  useEffect(() => {
    if (open) {
      setLocalTriggers(triggers)
    }
  }, [open, triggers])

  const handleSave = () => {
    onSave(localTriggers)
    onOpenChange(false)
  }

  const handlePreviousRolesChange = (
    mode: 'auto' | 'custom',
    selectedRoleIds: string[]
  ) => {
    setLocalTriggers({
      ...localTriggers,
      on_previous_roles_signed: {
        ...localTriggers.on_previous_roles_signed,
        enabled: localTriggers.on_previous_roles_signed?.enabled ?? false,
        previousRolesConfig: { mode, selectedRoleIds },
      },
    })
    setShowPreviousRolesSelector(false)
  }

  return (
    <>
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            className={cn(
              'fixed left-[50%] top-[50%] z-50 w-full max-w-sm translate-x-[-50%] translate-y-[-50%] border border-border bg-background p-0 shadow-lg duration-200',
              'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
            )}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b border-border p-6">
              <div>
                <DialogPrimitive.Title className="font-mono text-sm font-medium uppercase tracking-widest text-foreground">
                  {t('editor.workflow.notificationsFor')}
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                  {role.label}
                </DialogPrimitive.Description>
              </div>
              <DialogPrimitive.Close className="text-muted-foreground transition-colors hover:text-foreground">
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>

            {/* Content */}
            <div className="p-6">
              <p className="text-xs text-muted-foreground mb-6">
                {t('editor.workflow.notificationsDescription')}
              </p>
              <NotificationTriggersList
                triggers={localTriggers}
                orderMode={orderMode}
                onChange={setLocalTriggers}
                roles={allRoles}
                onOpenPreviousRolesSelector={() =>
                  setShowPreviousRolesSelector(true)
                }
              />
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
        roles={allRoles}
        currentRoleId={role.id}
        config={localTriggers.on_previous_roles_signed?.previousRolesConfig}
        onSave={handlePreviousRolesChange}
      />
    </>
  )
}
