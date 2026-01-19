import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { NotificationScope } from '../../types/signer-roles'

interface NotificationScopeSelectorProps {
  value: NotificationScope
  onChange: (scope: NotificationScope) => void
}

export function NotificationScopeSelector({
  value,
  onChange,
}: NotificationScopeSelectorProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-2">
      <Label className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {t('editor.workflow.notificationScope')}
      </Label>
      <div className="flex rounded-none border border-border bg-background p-0.5">
        <button
          type="button"
          onClick={() => onChange('global')}
          className={cn(
            'flex-1 px-3 py-2 text-xs font-medium transition-colors',
            value === 'global'
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {t('editor.workflow.global')}
        </button>
        <button
          type="button"
          onClick={() => onChange('individual')}
          className={cn(
            'flex-1 px-3 py-2 text-xs font-medium transition-colors',
            value === 'individual'
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {t('editor.workflow.individual')}
        </button>
      </div>
    </div>
  )
}
