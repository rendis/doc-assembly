import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useInviteWorkspaceMember } from '@/features/workspaces/hooks/useWorkspaceMembers'
import { useToast } from '@/components/ui/use-toast'
import axios from 'axios'

interface InviteWorkspaceMemberDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const ROLE_OPTIONS = [
  { value: 'VIEWER', labelKey: 'settings.members.roles.viewer', fallback: 'Viewer' },
  { value: 'OPERATOR', labelKey: 'settings.members.roles.operator', fallback: 'Operator' },
  { value: 'EDITOR', labelKey: 'settings.members.roles.editor', fallback: 'Editor' },
  { value: 'ADMIN', labelKey: 'settings.members.roles.admin', fallback: 'Admin' },
  { value: 'OWNER', labelKey: 'settings.members.roles.owner', fallback: 'Owner' },
]

export function InviteWorkspaceMemberDialog({
  open,
  onOpenChange,
}: InviteWorkspaceMemberDialogProps): React.ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <InviteWorkspaceMemberDialogContent onOpenChange={onOpenChange} />}
    </Dialog>
  )
}

function InviteWorkspaceMemberDialogContent({
  onOpenChange,
}: {
  onOpenChange: (open: boolean) => void
}): React.ReactElement {
  const { t } = useTranslation()
  const { toast } = useToast()

  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('VIEWER')
  const [emailError, setEmailError] = useState('')

  const inviteMutation = useInviteWorkspaceMember()
  const isLoading = inviteMutation.isPending

  const validateForm = (): boolean => {
    if (!email.trim()) {
      setEmailError(
        t('settings.members.invite.emailRequired', 'Email is required')
      )
      return false
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setEmailError(
        t('settings.members.invite.emailInvalid', 'Please enter a valid email')
      )
      return false
    }
    setEmailError('')
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      await inviteMutation.mutateAsync({
        email: email.trim(),
        fullName: fullName.trim() || undefined,
        role,
      })
      toast({
        title: t('settings.members.invite.success', 'Member invited'),
      })
      onOpenChange(false)
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        setEmailError(
          t(
            'settings.members.invite.memberExists',
            'This user is already a member'
          )
        )
      } else {
        toast({
          variant: 'destructive',
          title: t('common.error', 'Error'),
          description: t(
            'settings.members.invite.error',
            'Failed to invite member'
          ),
        })
      }
    }
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>
          {t('settings.members.invite.title', 'Invite Member')}
        </DialogTitle>
        <DialogDescription>
          {t(
            'settings.members.invite.description',
            'Invite a user to this workspace.'
          )}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            {t('settings.members.invite.email', 'Email')} *
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              setEmailError('')
            }}
            placeholder="user@example.com"
            className={cn(
              'w-full rounded-sm border bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-foreground',
              emailError ? 'border-destructive' : 'border-border'
            )}
            disabled={isLoading}
          />
          {emailError && (
            <p className="mt-1 text-xs text-destructive">{emailError}</p>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">
            {t('settings.members.invite.fullName', 'Full Name')}
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={t(
              'settings.members.invite.fullNamePlaceholder',
              'John Doe'
            )}
            className="w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-foreground"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">
            {t('settings.members.invite.role', 'Role')} *
          </label>
          <div className="flex flex-wrap gap-2">
            {ROLE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRole(option.value)}
                className={cn(
                  'rounded-sm border px-3 py-2 font-mono text-xs uppercase tracking-wider transition-colors',
                  role === option.value
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
                )}
                disabled={isLoading}
              >
                {t(option.labelKey, option.fallback)}
              </button>
            ))}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-sm border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            disabled={isLoading}
          >
            {t('common.cancel', 'Cancel')}
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-sm bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
            disabled={isLoading}
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            {t('settings.members.invite.submit', 'Invite Member')}
          </button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
