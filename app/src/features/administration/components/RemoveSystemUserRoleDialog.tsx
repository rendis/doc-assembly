import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { getApiErrorMessage } from '@/lib/api-client'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { SystemUser } from '@/types/api'
import { useRevokeSystemUserRole } from '../hooks/useSystemUsers'

interface RemoveSystemUserRoleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  systemUser: SystemUser | null
  disabledReason?: string | null
}

export function RemoveSystemUserRoleDialog({
  open,
  onOpenChange,
  systemUser,
  disabledReason,
}: RemoveSystemUserRoleDialogProps): React.ReactElement {
  const { t } = useTranslation()
  const { toast } = useToast()

  const revokeMutation = useRevokeSystemUserRole()
  const isLoading = revokeMutation.isPending

  const handleRemove = async () => {
    if (!systemUser || disabledReason) return

    try {
      await revokeMutation.mutateAsync(systemUser.userId)
      toast({
        title: t('administration.users.remove.success', 'System role removed'),
      })
      onOpenChange(false)
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error', 'Error'),
        description: getApiErrorMessage(error),
      })
    }
  }

  if (!systemUser) return <></>

  const displayName = systemUser.user?.fullName || systemUser.user?.email || systemUser.userId

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono text-sm uppercase tracking-widest">
            <AlertTriangle size={18} className="text-destructive" />
            {t('administration.users.remove.title', 'Remove System Role')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'administration.users.remove.confirm',
              'Are you sure you want to remove system access from "{{name}}"?',
              { name: displayName }
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {disabledReason ? (
            <div className="rounded-sm border border-warning-border bg-warning-muted p-3">
              <p className="text-sm text-warning-foreground">{disabledReason}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {t(
                'administration.users.remove.description',
                'This user will immediately lose platform-level administration access.'
              )}
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-sm border border-border bg-background px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
            disabled={isLoading}
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            type="button"
            onClick={handleRemove}
            className="inline-flex items-center gap-2 rounded-sm bg-destructive px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
            disabled={isLoading || !!disabledReason}
          >
            {isLoading && <Loader2 size={14} className="animate-spin" />}
            {t('common.remove', 'Remove')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
