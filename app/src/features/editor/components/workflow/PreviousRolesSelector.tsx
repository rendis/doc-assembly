import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import type {
  SignerRoleDefinition,
  PreviousRolesConfig,
} from '../../types/signer-roles'

interface PreviousRolesSelectorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  roles: SignerRoleDefinition[]
  currentRoleId?: string
  config?: PreviousRolesConfig
  onSave: (mode: 'auto' | 'custom', selectedRoleIds: string[]) => void
}

export function PreviousRolesSelector({
  open,
  onOpenChange,
  roles,
  currentRoleId,
  config,
  onSave,
}: PreviousRolesSelectorProps) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<'auto' | 'custom'>(config?.mode ?? 'auto')
  const [selectedIds, setSelectedIds] = useState<string[]>(
    config?.selectedRoleIds ?? []
  )

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional reset on dialog open
      setMode(config?.mode ?? 'auto')
      setSelectedIds(config?.selectedRoleIds ?? [])
    }
  }, [open, config])

  // Filter to only show roles that come before the current role (if specified)
  const currentRole = currentRoleId
    ? roles.find((r) => r.id === currentRoleId)
    : null
  const availableRoles = currentRole
    ? roles.filter((r) => r.order < currentRole.order)
    : roles

  const handleToggleRole = (roleId: string) => {
    setSelectedIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    )
  }

  const handleSave = () => {
    onSave(mode, mode === 'custom' ? selectedIds : [])
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-50 w-full max-w-sm translate-x-[-50%] translate-y-[-50%] border border-border bg-background p-0 shadow-lg duration-200',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95'
          )}
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-border p-6">
            <div>
              <DialogPrimitive.Title className="font-mono text-sm font-medium uppercase tracking-widest text-foreground">
                {t('editor.workflow.previousRoles.title')}
              </DialogPrimitive.Title>
            </div>
            <DialogPrimitive.Close className="text-muted-foreground transition-colors hover:text-foreground">
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </DialogPrimitive.Close>
          </div>

          {/* Content */}
          <div className="space-y-6 p-6">
            {/* Mode selector */}
            <div className="flex rounded-none border border-border bg-background p-0.5">
              <button
                type="button"
                onClick={() => setMode('auto')}
                className={cn(
                  'flex-1 px-3 py-2 text-xs font-medium transition-colors',
                  mode === 'auto'
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t('editor.workflow.previousRoles.auto')}
              </button>
              <button
                type="button"
                onClick={() => setMode('custom')}
                className={cn(
                  'flex-1 px-3 py-2 text-xs font-medium transition-colors',
                  mode === 'custom'
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t('editor.workflow.previousRoles.custom')}
              </button>
            </div>

            {mode === 'auto' ? (
              <p className="text-xs text-muted-foreground">
                {t('editor.workflow.previousRoles.autoDescription')}
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  {t('editor.workflow.previousRoles.customDescription')}
                </p>
                {availableRoles.length === 0 ? (
                  <p className="text-xs text-muted-foreground/70 italic">
                    {t('editor.workflow.previousRoles.noRoles')}
                  </p>
                ) : (
                  <ScrollArea className="max-h-48 border border-border">
                    <div className="p-4 space-y-3">
                      {availableRoles
                        .sort((a, b) => a.order - b.order)
                        .map((role) => (
                          <div key={role.id} className="flex items-center gap-3">
                            <Checkbox
                              id={`role-${role.id}`}
                              checked={selectedIds.includes(role.id)}
                              onCheckedChange={() => handleToggleRole(role.id)}
                            />
                            <Label
                              htmlFor={`role-${role.id}`}
                              className="text-xs cursor-pointer text-foreground flex-1"
                            >
                              <span className="font-medium">{role.label}</span>
                              <span className="text-muted-foreground ml-2">
                                (orden {role.order})
                              </span>
                            </Label>
                          </div>
                        ))}
                    </div>
                  </ScrollArea>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-border p-6">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-none border border-border bg-background px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-none bg-foreground px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-background transition-colors hover:bg-foreground/90"
            >
              {t('common.apply')}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
