import { X, FlaskConical, AlertCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  BaseDialogContent,
  DialogClose,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

interface SandboxConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  action: 'enable' | 'disable' | null
  onConfirm: () => void
  isPending?: boolean
}

export function SandboxConfirmDialog({
  open,
  onOpenChange,
  action,
  onConfirm,
  isPending = false,
}: SandboxConfirmDialogProps) {
  const { t } = useTranslation()

  const isEnabling = action === 'enable'

  const handleConfirm = () => {
    onConfirm()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <BaseDialogContent className="max-w-md">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border p-6">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 items-center justify-center',
                isEnabling ? 'bg-sandbox-muted' : 'bg-muted'
              )}
            >
              <FlaskConical
                size={20}
                className={isEnabling ? 'text-sandbox' : 'text-foreground'}
              />
            </div>
            <div>
              <DialogTitle className="font-mono text-sm font-medium uppercase tracking-widest text-foreground">
                {isEnabling
                  ? t('settings.sandbox.dialog.enableTitle', 'Enter Sandbox Mode')
                  : t('settings.sandbox.dialog.disableTitle', 'Exit Sandbox Mode')}
              </DialogTitle>
              <DialogDescription className="mt-1 text-sm font-light text-muted-foreground">
                {isEnabling
                  ? t(
                      'settings.sandbox.dialog.enableDesc',
                      'Switch to an isolated testing environment'
                    )
                  : t('settings.sandbox.dialog.disableDesc', 'Return to production mode')}
              </DialogDescription>
            </div>
          </div>
          <DialogClose className="text-muted-foreground transition-colors hover:text-foreground">
            <X className="h-5 w-5" />
          </DialogClose>
        </div>

        {/* Content */}
        <div className="space-y-4 p-6">
          <div className="flex gap-3 border border-border bg-muted/50 p-4">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-muted-foreground" />
            <p className="text-sm leading-relaxed text-muted-foreground">
              {isEnabling
                ? t(
                    'settings.sandbox.dialog.enableWarning',
                    'In sandbox mode, your changes will be isolated from production. Dashboard and Settings will be hidden.'
                  )
                : t(
                    'settings.sandbox.dialog.disableWarning',
                    'Returning to production mode. Your sandbox changes will remain available if you re-enter sandbox mode.'
                  )}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 border-t border-border p-6">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="rounded-none border border-border bg-background px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground disabled:opacity-50"
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isPending}
            className={cn(
              'rounded-none px-6 py-2.5 font-mono text-xs uppercase tracking-wider transition-colors disabled:opacity-50',
              isEnabling
                ? 'bg-sandbox text-sandbox-foreground hover:bg-sandbox/90'
                : 'bg-foreground text-background hover:bg-foreground/90'
            )}
          >
            {isEnabling
              ? t('settings.sandbox.dialog.enableConfirm', 'Enter Sandbox')
              : t('settings.sandbox.dialog.disableConfirm', 'Exit Sandbox')}
          </button>
        </div>
      </BaseDialogContent>
    </Dialog>
  )
}
