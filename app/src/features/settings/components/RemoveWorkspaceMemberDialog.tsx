import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useRemoveWorkspaceMember } from '@/features/workspaces/hooks/useWorkspaceMembers'
import { useToast } from '@/components/ui/use-toast'
import type { WorkspaceMember } from '@/types/api'

interface RemoveWorkspaceMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member: WorkspaceMember | null
}

export function RemoveWorkspaceMemberDialog({
  open,
  onOpenChange,
  member,
}: RemoveWorkspaceMemberDialogProps): React.ReactElement {
  const { t } = useTranslation()
  const { toast } = useToast()

  const removeMutation = useRemoveWorkspaceMember()
  const isLoading = removeMutation.isPending

  const handleRemove = async () => {
    if (!member) return

    try {
      await removeMutation.mutateAsync(member.id)
      toast({
        title: t('settings.members.remove.success', 'Member removed'),
      })
      onOpenChange(false)
    } catch {
      toast({
        variant: 'destructive',
        title: t('common.error', 'Error'),
        description: t(
          'settings.members.remove.error',
          'Failed to remove member'
        ),
      })
    }
  }

  if (!member) return <></>

  const displayName = member.user?.fullName || member.user?.email || member.id

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-mono text-sm uppercase tracking-widest">
            <AlertTriangle size={18} className="text-destructive" />
            {t('settings.members.remove.title', 'Remove Member')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'settings.members.remove.confirm',
              'Are you sure you want to remove "{{name}}"?',
              { name: displayName }
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-4">
          {member.role === 'OWNER' && (
            <div className="rounded-sm border border-warning-border bg-warning-muted p-3">
              <p className="text-sm text-warning-foreground">
                {t(
                  'settings.members.remove.ownerWarning',
                  'This member is a workspace owner. Removing them may affect workspace administration.'
                )}
              </p>
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            {t(
              'settings.members.remove.description',
              'This user will lose access to this workspace.'
            )}
          </p>
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
            disabled={isLoading}
          >
            {isLoading && <Loader2 size={14} className="animate-spin" />}
            {t('common.remove', 'Remove')}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
