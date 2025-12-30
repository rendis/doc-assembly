import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type {
  SignerRoleDefinition,
  NotificationTriggerMap,
  SigningOrderMode,
} from '../../types/signer-roles';
import { NotificationTriggersList } from './NotificationTriggersList';
import { PreviousRolesSelector } from './PreviousRolesSelector';

interface NotificationConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: SignerRoleDefinition;
  allRoles: SignerRoleDefinition[];
  triggers: NotificationTriggerMap;
  orderMode: SigningOrderMode;
  onSave: (triggers: NotificationTriggerMap) => void;
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
  const { t } = useTranslation();
  const [localTriggers, setLocalTriggers] =
    useState<NotificationTriggerMap>(triggers);
  const [showPreviousRolesSelector, setShowPreviousRolesSelector] =
    useState(false);

  // Reset local state when dialog opens
  useEffect(() => {
    if (open) {
      setLocalTriggers(triggers);
    }
  }, [open, triggers]);

  const handleSave = () => {
    onSave(localTriggers);
    onOpenChange(false);
  };

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
    });
    setShowPreviousRolesSelector(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">
              {t('editor.workflow.notificationsFor', 'Notificaciones')} -{' '}
              {role.label}
            </DialogTitle>
          </DialogHeader>

          <div className="py-2">
            <p className="text-xs text-muted-foreground mb-4">
              {t(
                'editor.workflow.notificationsDescription',
                'Selecciona cuándo este firmante recibirá notificaciones:'
              )}
            </p>
            <NotificationTriggersList
              triggers={localTriggers}
              orderMode={orderMode}
              onChange={setLocalTriggers}
              roles={allRoles}
              currentRoleId={role.id}
              onOpenPreviousRolesSelector={() =>
                setShowPreviousRolesSelector(true)
              }
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              {t('common.cancel', 'Cancelar')}
            </Button>
            <Button size="sm" onClick={handleSave}>
              {t('common.save', 'Guardar')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PreviousRolesSelector
        open={showPreviousRolesSelector}
        onOpenChange={setShowPreviousRolesSelector}
        roles={allRoles}
        currentRoleId={role.id}
        config={localTriggers.on_previous_roles_signed?.previousRolesConfig}
        onSave={handlePreviousRolesChange}
      />
    </>
  );
}
