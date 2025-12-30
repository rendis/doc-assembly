import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { SigningOrderMode } from '../../types/signer-roles';

interface SigningOrderSelectorProps {
  value: SigningOrderMode;
  onChange: (mode: SigningOrderMode) => void;
}

export function SigningOrderSelector({
  value,
  onChange,
}: SigningOrderSelectorProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-2">
      <Label className="text-xs text-muted-foreground">
        {t('editor.workflow.orderMode', 'Orden de firma')}
      </Label>
      <div className="flex rounded-md border p-0.5 bg-muted/50">
        <button
          type="button"
          onClick={() => onChange('parallel')}
          className={cn(
            'flex-1 px-3 py-1.5 text-xs font-medium rounded-sm transition-colors',
            value === 'parallel'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {t('editor.workflow.parallel', 'Paralelo')}
        </button>
        <button
          type="button"
          onClick={() => onChange('sequential')}
          className={cn(
            'flex-1 px-3 py-1.5 text-xs font-medium rounded-sm transition-colors',
            value === 'sequential'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {t('editor.workflow.sequential', 'Secuencial')}
        </button>
      </div>
    </div>
  );
}
