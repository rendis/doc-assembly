import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import type {
  NotificationTrigger,
  NotificationTriggerMap,
  SigningOrderMode,
  SignerRoleDefinition,
  PreviousRolesConfig,
} from '../../types/signer-roles';

// All triggers in display order
const ALL_TRIGGERS: NotificationTrigger[] = [
  'on_document_created',
  'on_previous_roles_signed',
  'on_turn_to_sign',
  'on_all_signatures_complete',
];

// Triggers that are only available in sequential mode
const SEQUENTIAL_ONLY_TRIGGERS: NotificationTrigger[] = [
  'on_previous_roles_signed',
  'on_turn_to_sign',
];

interface NotificationTriggersListProps {
  triggers: NotificationTriggerMap;
  orderMode: SigningOrderMode;
  onChange: (triggers: NotificationTriggerMap) => void;
  roles?: SignerRoleDefinition[];
  onOpenPreviousRolesSelector?: () => void;
}

const TRIGGER_LABELS: Record<NotificationTrigger, { key: string; default: string }> = {
  on_document_created: {
    key: 'editor.workflow.triggers.onDocumentCreated',
    default: 'Al crear documento',
  },
  on_previous_roles_signed: {
    key: 'editor.workflow.triggers.onPreviousRolesSigned',
    default: 'Cuando firmen roles anteriores',
  },
  on_turn_to_sign: {
    key: 'editor.workflow.triggers.onTurnToSign',
    default: 'Cuando le toque firmar',
  },
  on_all_signatures_complete: {
    key: 'editor.workflow.triggers.onAllComplete',
    default: 'Al completar todas las firmas',
  },
};

export function NotificationTriggersList({
  triggers,
  orderMode,
  onChange,
  roles,
  onOpenPreviousRolesSelector,
}: NotificationTriggersListProps) {
  const { t } = useTranslation();
  const isSequential = orderMode === 'sequential';

  const handleToggle = (trigger: NotificationTrigger, enabled: boolean) => {
    const current = triggers[trigger] || { enabled: false };
    onChange({
      ...triggers,
      [trigger]: { ...current, enabled },
    });
  };

  const getPreviousRolesLabel = (config?: PreviousRolesConfig): string => {
    if (!config || config.mode === 'auto') {
      return t('editor.workflow.previousRoles.auto', 'Automático');
    }
    if (config.selectedRoleIds.length === 0) {
      return t('editor.workflow.previousRoles.none', 'Ninguno');
    }
    const selectedRoles = roles?.filter((r) =>
      config.selectedRoleIds.includes(r.id)
    );
    if (!selectedRoles || selectedRoles.length === 0) {
      return t('editor.workflow.previousRoles.auto', 'Automático');
    }
    return selectedRoles.map((r) => r.label).join(', ');
  };

  return (
    <div className="space-y-3">
      {ALL_TRIGGERS.map((trigger) => {
        const isEnabled = triggers[trigger]?.enabled ?? false;
        const label = TRIGGER_LABELS[trigger];
        const isPreviousRoles = trigger === 'on_previous_roles_signed';
        const isSequentialOnly = SEQUENTIAL_ONLY_TRIGGERS.includes(trigger);
        const isVisible = !isSequentialOnly || isSequential;

        return (
          <div
            key={trigger}
            className="grid transition-[grid-template-rows] duration-200 ease-out"
            style={{ gridTemplateRows: isVisible ? '1fr' : '0fr' }}
          >
            <div className="overflow-hidden space-y-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  id={trigger}
                  checked={isEnabled}
                  onCheckedChange={(checked) =>
                    handleToggle(trigger, checked === true)
                  }
                  disabled={!isVisible}
                />
                <Label
                  htmlFor={trigger}
                  className="text-xs cursor-pointer leading-tight"
                >
                  {t(label.key, label.default)}
                </Label>
              </div>

              {isPreviousRoles && isEnabled && (
                <div className="ml-6 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {getPreviousRolesLabel(
                      triggers.on_previous_roles_signed?.previousRolesConfig
                    )}
                  </span>
                  {onOpenPreviousRolesSelector && (
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs"
                      onClick={onOpenPreviousRolesSelector}
                    >
                      {t('editor.workflow.previousRoles.customize', 'Personalizar')}
                    </Button>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
