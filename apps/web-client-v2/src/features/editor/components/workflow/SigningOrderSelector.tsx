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
  return (
    <div className="space-y-2">
      <Label className="text-[10px] font-mono uppercase tracking-widest text-gray-400">
        Orden de firma
      </Label>
      <div className="flex rounded-md border border-gray-100 p-0.5 bg-gray-50">
        <button
          type="button"
          onClick={() => onChange('parallel')}
          className={cn(
            'flex-1 px-3 py-1.5 text-xs font-medium rounded-sm transition-colors',
            value === 'parallel'
              ? 'bg-white text-black shadow-sm'
              : 'text-gray-400 hover:text-black'
          )}
        >
          Paralelo
        </button>
        <button
          type="button"
          onClick={() => onChange('sequential')}
          className={cn(
            'flex-1 px-3 py-1.5 text-xs font-medium rounded-sm transition-colors',
            value === 'sequential'
              ? 'bg-white text-black shadow-sm'
              : 'text-gray-400 hover:text-black'
          )}
        >
          Secuencial
        </button>
      </div>
    </div>
  )
}
