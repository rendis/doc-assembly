import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAddSystemUser } from '../hooks/useSystemUsers'

interface AddSystemUserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const ROLE_OPTIONS = [
  {
    value: 'PLATFORM_ADMIN',
    labelKey: 'administration.users.form.roles.platformAdmin',
    fallback: 'Platform Admin',
    descKey: 'administration.users.form.roles.platformAdminDesc',
    descFallback: 'Operational platform access without full superadmin authority.',
  },
  {
    value: 'SUPERADMIN',
    labelKey: 'administration.users.form.roles.superAdmin',
    fallback: 'Superadmin',
    descKey: 'administration.users.form.roles.superAdminDesc',
    descFallback: 'Full global administration across system, tenants, and workspaces.',
  },
] as const

export function AddSystemUserDialog({
  open,
  onOpenChange,
}: AddSystemUserDialogProps): React.ReactElement {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && <AddSystemUserDialogContent onOpenChange={onOpenChange} />}
    </Dialog>
  )
}

function AddSystemUserDialogContent({
  onOpenChange,
}: {
  onOpenChange: (open: boolean) => void
}): React.ReactElement {
  const { t } = useTranslation()
  const { toast } = useToast()
  const addMutation = useAddSystemUser()
  const isLoading = addMutation.isPending

  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'PLATFORM_ADMIN' | 'SUPERADMIN'>('PLATFORM_ADMIN')
  const [emailError, setEmailError] = useState('')

  const validateForm = (): boolean => {
    if (!email.trim()) {
      setEmailError(t('administration.users.form.emailRequired', 'Email is required'))
      return false
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      setEmailError(t('administration.users.form.emailInvalid', 'Please enter a valid email'))
      return false
    }
    setEmailError('')
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    try {
      await addMutation.mutateAsync({
        email: email.trim(),
        fullName: fullName.trim() || undefined,
        role,
      })
      toast({
        title: t('administration.users.form.addSuccess', 'Member added'),
      })
      onOpenChange(false)
    } catch {
      toast({
        variant: 'destructive',
        title: t('common.error', 'Error'),
        description: t('administration.users.form.addError', 'Failed to add member'),
      })
    }
  }

  return (
    <DialogContent className="sm:max-w-md">
      <DialogHeader>
        <DialogTitle>{t('administration.users.form.title', 'Add Member')}</DialogTitle>
        <DialogDescription>
          {t(
            'administration.users.form.description',
            'Create or promote a user with global system access.'
          )}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1.5 block text-sm font-medium">
            {t('administration.users.form.email', 'Email')} *
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
          {emailError && <p className="mt-1 text-xs text-destructive">{emailError}</p>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">
            {t('administration.users.form.fullName', 'Full Name')}
          </label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={t('administration.users.form.fullNamePlaceholder', 'John Doe')}
            className="w-full rounded-sm border border-border bg-transparent px-3 py-2 text-sm outline-none transition-colors focus:border-foreground"
            disabled={isLoading}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium">
            {t('administration.users.form.role', 'Role')} *
          </label>
          <TooltipProvider delayDuration={300}>
            <div className="flex gap-2">
              {ROLE_OPTIONS.map((option) => (
                <Tooltip key={option.value}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setRole(option.value)}
                      className={cn(
                        'flex-1 rounded-sm border px-3 py-2 font-mono text-xs uppercase tracking-wider transition-colors',
                        role === option.value
                          ? 'border-foreground bg-foreground text-background'
                          : 'border-border text-muted-foreground hover:border-foreground hover:text-foreground'
                      )}
                      disabled={isLoading}
                    >
                      {t(option.labelKey, option.fallback)}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[220px] text-center">
                    <p className="text-xs">{t(option.descKey, option.descFallback)}</p>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>
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
            {t('administration.users.form.add', 'Add Member')}
          </button>
        </DialogFooter>
      </form>
    </DialogContent>
  )
}
