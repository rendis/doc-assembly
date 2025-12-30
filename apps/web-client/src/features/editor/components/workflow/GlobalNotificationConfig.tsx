import { useState } from 'react';
import { Bell, ChevronDown, Settings2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useSignerRolesStore } from '../../stores/signer-roles-store';
import { countActiveTriggers } from '../../types/signer-roles';
import { SigningOrderSelector } from './SigningOrderSelector';
import { NotificationScopeSelector } from './NotificationScopeSelector';
import { NotificationTriggersList } from './NotificationTriggersList';
import { PreviousRolesSelector } from './PreviousRolesSelector';

export function GlobalNotificationConfig() {
  const { t } = useTranslation();
  const [isExpanded, setIsExpanded] = useState(true);
  const [showPreviousRolesSelector, setShowPreviousRolesSelector] =
    useState(false);

  const {
    workflowConfig,
    setOrderMode,
    setNotificationScope,
    updateGlobalTriggers,
    roles,
  } = useSignerRolesStore();
  const { orderMode, notifications } = workflowConfig;

  const activeCount = countActiveTriggers(notifications.globalTriggers);
  const isGlobalScope = notifications.scope === 'global';

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
    });
    setShowPreviousRolesSelector(false);
  };

  return (
    <>
      <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 overflow-hidden">
        {/* Accordion Header */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between p-3 hover:bg-primary/10 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              {t('editor.workflow.title', 'Configuración de firma')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isGlobalScope && (
              <Badge
                variant={activeCount > 0 ? 'default' : 'secondary'}
                className="text-[10px] px-1.5 py-0"
              >
                <Bell className="h-3 w-3 mr-1" />
                {activeCount > 0
                  ? t('editor.workflow.activeCount', '{{count}} activos', {
                      count: activeCount,
                    })
                  : t('editor.workflow.notConfigured', 'Sin configurar')}
              </Badge>
            )}
            <ChevronDown
              className={cn(
                'h-4 w-4 text-muted-foreground transition-transform duration-200',
                isExpanded && 'rotate-180'
              )}
            />
          </div>
        </button>

        {/* Accordion Content */}
        <div
          className={cn(
            'overflow-hidden transition-all duration-200',
            isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
          )}
        >
          <div className="p-3 pt-0 border-t border-primary/10 space-y-4">
            {/* Signing Order Selector */}
            <SigningOrderSelector value={orderMode} onChange={setOrderMode} />

            <Separator className="bg-primary/10" />

            {/* Notification Scope Selector */}
            <NotificationScopeSelector
              value={notifications.scope}
              onChange={setNotificationScope}
            />

            {/* Global Notification Triggers (only when scope is global) */}
            {isGlobalScope && (
              <>
                <Separator className="bg-primary/10" />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">
                      {t(
                        'editor.workflow.notifyWhen',
                        'Notificar a firmantes cuando:'
                      )}
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
              </>
            )}

            {/* Hint for individual mode */}
            {!isGlobalScope && (
              <p className="text-xs text-muted-foreground italic">
                {t(
                  'editor.workflow.individualHint',
                  'Configura las notificaciones de cada rol usando el icono de campana en cada tarjeta.'
                )}
              </p>
            )}
          </div>
        </div>
      </div>

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
  );
}
