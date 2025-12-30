import { Settings2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { useSignerRolesStore } from '../../stores/signer-roles-store';
import { SigningOrderSelector } from './SigningOrderSelector';
import { NotificationScopeSelector } from './NotificationScopeSelector';

export function WorkflowSettingsPopover() {
  const { t } = useTranslation();
  const { workflowConfig, setOrderMode, setNotificationScope } =
    useSignerRolesStore();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title={t('editor.workflow.settings', 'Configuración de firma')}
        >
          <Settings2 className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="end">
        <div className="p-3 border-b">
          <p className="text-sm font-medium">
            {t('editor.workflow.title', 'Configuración de firma')}
          </p>
        </div>
        <div className="p-3 space-y-4">
          <SigningOrderSelector
            value={workflowConfig.orderMode}
            onChange={setOrderMode}
          />
          <Separator />
          <NotificationScopeSelector
            value={workflowConfig.notifications.scope}
            onChange={setNotificationScope}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}
