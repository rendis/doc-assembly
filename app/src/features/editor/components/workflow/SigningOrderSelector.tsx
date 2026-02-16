import { useTranslation } from 'react-i18next'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import type { SigningOrderMode } from '../../types/signer-roles'

interface SigningOrderSelectorProps {
  value: SigningOrderMode
  onChange: (mode: SigningOrderMode) => void
}

export function SigningOrderSelector({
  value,
  onChange,
}: SigningOrderSelectorProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-2">
      <Label className="font-mono text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
        {t('editor.workflow.orderMode')}
      </Label>
      <div className="flex rounded-none border border-border bg-background p-0.5">
        <button
          type="button"
          onClick={() => onChange('parallel')}
          className={cn(
            'flex-1 px-3 py-2 text-xs font-medium transition-colors',
            value === 'parallel'
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {t('editor.workflow.parallel')}
        </button>
        <button
          type="button"
          onClick={() => onChange('sequential')}
          className={cn(
            'flex-1 px-3 py-2 text-xs font-medium transition-colors',
            value === 'sequential'
              ? 'bg-foreground text-background'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {t('editor.workflow.sequential')}
        </button>
      </div>
    </div>
  )
}
