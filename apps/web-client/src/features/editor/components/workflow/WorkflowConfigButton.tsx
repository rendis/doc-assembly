import { useState } from 'react';
import { Settings2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useSignerRolesStore } from '../../stores/signer-roles-store';
import { countActiveTriggers } from '../../types/signer-roles';
import { WorkflowConfigModal } from './WorkflowConfigModal';

export function WorkflowConfigButton() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const workflowConfig = useSignerRolesStore((state) => state.workflowConfig);
  const { notifications } = workflowConfig;

  const isGlobalScope = notifications.scope === 'global';
  const activeCount = isGlobalScope
    ? countActiveTriggers(notifications.globalTriggers)
    : 0;

  return (
    <>
      <Button
        variant="secondary"
        className="w-full justify-between bg-primary/10 hover:bg-primary/20 border border-primary/20"
        onClick={() => setOpen(true)}
      >
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">
            {t('editor.workflow.settings', 'Configuración de firma')}
          </span>
        </div>
        {isGlobalScope && activeCount > 0 && (
          <Badge variant="default" className="text-[10px] px-1.5 py-0">
            {t('editor.workflow.activeCount', '{{count}} activos', {
              count: activeCount,
            })}
          </Badge>
        )}
      </Button>

      <WorkflowConfigModal open={open} onOpenChange={setOpen} />
    </>
  );
}
