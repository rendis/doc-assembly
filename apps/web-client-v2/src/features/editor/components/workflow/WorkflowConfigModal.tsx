import { useState } from 'react'
import { Bell, Settings2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Separator } from '@/components/ui/separator'
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-gray-400" />
              Configuración de firma
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Signing Order Selector */}
            <SigningOrderSelector value={orderMode} onChange={setOrderMode} />

            <Separator className="bg-gray-100" />

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
                <Separator className="mb-4 bg-gray-100" />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Bell className="h-3.5 w-3.5 text-gray-400" />
                    <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">
                      Notificar a firmantes cuando:
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
              <p className="overflow-hidden text-xs text-gray-400 italic">
                Configura las notificaciones de cada rol usando el icono de
                campana en cada tarjeta.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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
