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
  return (
    <div className="space-y-2">
      <Label className="text-[10px] font-mono uppercase tracking-widest text-gray-400">
        Notificaciones
      </Label>
      <div className="flex rounded-md border border-gray-100 p-0.5 bg-gray-50">
        <button
          type="button"
          onClick={() => onChange('global')}
          className={cn(
            'flex-1 px-3 py-1.5 text-xs font-medium rounded-sm transition-colors',
            value === 'global'
              ? 'bg-white text-black shadow-sm'
              : 'text-gray-400 hover:text-black'
          )}
        >
          Global
        </button>
        <button
          type="button"
          onClick={() => onChange('individual')}
          className={cn(
            'flex-1 px-3 py-1.5 text-xs font-medium rounded-sm transition-colors',
            value === 'individual'
              ? 'bg-white text-black shadow-sm'
              : 'text-gray-400 hover:text-black'
          )}
        >
          Individual
        </button>
      </div>
    </div>
  )
}
