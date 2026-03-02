import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { Check, ChevronDown, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProcesses } from '../hooks/useProcesses'

interface ProcessSelectorProps {
  currentProcess?: string
  currentProcessType?: string
  onAssign: (data: { process: string; processType: string }) => Promise<void>
  disabled?: boolean
}

const DEFAULT_PROCESS = 'default'
const DEFAULT_PROCESS_TYPE = 'CANONICAL_NAME'

function getLocalizedName(name: Record<string, string>, locale: string): string {
  return name[locale] || name['es'] || name['en'] || Object.values(name)[0] || ''
}

export function ProcessSelector({
  currentProcess,
  currentProcessType,
  onAssign,
  disabled = false,
}: ProcessSelectorProps): React.ReactElement {
  const { t, i18n } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const { data: processesData } = useProcesses(1, 100)
  const processes = processesData?.data ?? []

  const effectiveProcess = currentProcess || DEFAULT_PROCESS
  const effectiveProcessType = currentProcessType || DEFAULT_PROCESS_TYPE

  const isDefault = effectiveProcess === DEFAULT_PROCESS

  const selectedProcess = processes.find((p) => p.code === effectiveProcess) ?? null
  const displayName = selectedProcess
    ? getLocalizedName(selectedProcess.name, i18n.language)
    : isDefault
      ? t('templates.detail.defaultProcess', 'Default')
      : effectiveProcess

  const handleSelect = async (process: string, processType: string) => {
    if (process === effectiveProcess && processType === effectiveProcessType) {
      setIsOpen(false)
      return
    }

    setIsLoading(true)
    try {
      await onAssign({ process, processType })
      setIsOpen(false)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild disabled={disabled || isLoading}>
        <button
          className={cn(
            'inline-flex items-center gap-2 text-sm transition-colors',
            'hover:text-foreground',
            'text-foreground',
            (disabled || isLoading) && 'cursor-not-allowed opacity-50'
          )}
        >
          {isLoading ? (
            <Loader2 size={12} className="animate-spin" />
          ) : (
            <>
              <span>{displayName}</span>
              <ChevronDown size={14} />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72 max-w-[90vw]">
        {/* Default option */}
        <DropdownMenuItem
          onClick={() => handleSelect(DEFAULT_PROCESS, DEFAULT_PROCESS_TYPE)}
          className="flex items-center justify-between"
        >
          <span>{t('templates.detail.defaultProcess', 'Default')}</span>
          {isDefault && <Check size={14} />}
        </DropdownMenuItem>

        {/* Separator */}
        {processes.length > 0 && (
          <div className="my-1 border-t border-border" />
        )}

        {/* Processes */}
        {processes.map((proc) => (
          <DropdownMenuItem
            key={proc.id}
            onClick={() => handleSelect(proc.code, proc.processType)}
            className="flex items-center justify-between"
          >
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="max-w-[140px] truncate">{getLocalizedName(proc.name, i18n.language)}</span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>{getLocalizedName(proc.name, i18n.language)}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <span className="shrink-0 rounded-sm border px-1 py-0.5 font-mono text-[10px] uppercase text-muted-foreground">
                {proc.code}
              </span>
            </div>
            {effectiveProcess === proc.code && <Check size={14} />}
          </DropdownMenuItem>
        ))}

        {/* Empty state */}
        {processes.length === 0 && (
          <div className="px-2 py-3 text-center text-sm text-muted-foreground">
            {t('templates.detail.noProcessesAvailable', 'No processes available')}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
