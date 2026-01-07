import { BellRing } from '@/components/animate-ui/icons/bell-ring'
import { AnimateIcon } from '@/components/animate-ui/icons/icon'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { NotificationTriggerMap } from '../../types/signer-roles'
import { countActiveTriggers } from '../../types/signer-roles'

interface NotificationBadgeProps {
  triggers: NotificationTriggerMap
  onClick: () => void
  className?: string
}

export function NotificationBadge({
  triggers,
  onClick,
  className,
}: NotificationBadgeProps) {
  const { t } = useTranslation()
  const activeCount = countActiveTriggers(triggers)

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        'h-6 w-6 relative text-muted-foreground rounded-full',
        'hover:bg-yellow-500/10 hover:text-yellow-500',
        'transition-colors',
        className
      )}
      onClick={onClick}
      title={t('editor.workflow.notifications')}
    >
      <AnimateIcon animateOnHover>
        <BellRing size={14} />
      </AnimateIcon>
      {activeCount > 0 && (
        <Badge
          variant="secondary"
          className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px] font-medium bg-foreground text-background pointer-events-none"
        >
          {activeCount}
        </Badge>
      )}
    </Button>
  )
}
