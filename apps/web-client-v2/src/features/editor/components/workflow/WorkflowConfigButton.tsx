import { useState } from 'react'
import { Settings2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useSignerRolesStore } from '../../stores/signer-roles-store'
import { countActiveTriggers } from '../../types/signer-roles'
import { WorkflowConfigModal } from './WorkflowConfigModal'

export function WorkflowConfigButton() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const workflowConfig = useSignerRolesStore((state) => state.workflowConfig)
  const { notifications } = workflowConfig

  const isGlobalScope = notifications.scope === 'global'
  const activeCount = isGlobalScope
    ? countActiveTriggers(notifications.globalTriggers)
    : 0

  return (
    <>
      <Button
        variant="outline"
        className="w-full justify-between border-border hover:border-primary text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setOpen(true)}
      >
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4" />
          <span className="text-xs font-medium">{t('editor.workflow.settings')}</span>
        </div>
        {isGlobalScope && activeCount > 0 && (
          <Badge
            variant="secondary"
            className="text-[10px] px-1.5 py-0 bg-foreground text-background pointer-events-none"
          >
            {t('editor.workflow.activeCount', { count: activeCount })}
          </Badge>
        )}
      </Button>

      <WorkflowConfigModal open={open} onOpenChange={setOpen} />
    </>
  )
}
