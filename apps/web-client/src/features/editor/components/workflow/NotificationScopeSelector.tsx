import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { NotificationScope } from '../../types/signer-roles';

interface NotificationScopeSelectorProps {
  value: NotificationScope;
  onChange: (scope: NotificationScope) => void;
}

export function NotificationScopeSelector({
  value,
  onChange,
}: NotificationScopeSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">
        {t('editor.workflow.notificationScope', 'Notificaciones')}
      </Label>
      <div className="flex rounded-md border p-0.5 bg-muted/50">
        <button
          type="button"
          onClick={() => onChange('global')}
          className={cn(
            'flex-1 px-3 py-1.5 text-xs font-medium rounded-sm transition-colors',
            value === 'global'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {t('editor.workflow.global', 'Global')}
        </button>
        <button
          type="button"
          onClick={() => onChange('individual')}
          className={cn(
            'flex-1 px-3 py-1.5 text-xs font-medium rounded-sm transition-colors',
            value === 'individual'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {t('editor.workflow.individual', 'Individual')}
        </button>
      </div>
    </div>
  );
}
