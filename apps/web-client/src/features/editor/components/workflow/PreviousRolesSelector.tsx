import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import type {
  SignerRoleDefinition,
  PreviousRolesConfig,
} from '../../types/signer-roles';

interface PreviousRolesSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roles: SignerRoleDefinition[];
  currentRoleId?: string;
  config?: PreviousRolesConfig;
  onSave: (mode: 'auto' | 'custom', selectedRoleIds: string[]) => void;
}

export function PreviousRolesSelector({
  open,
  onOpenChange,
  roles,
  currentRoleId,
  config,
  onSave,
}: PreviousRolesSelectorProps) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'auto' | 'custom'>(config?.mode ?? 'auto');
  const [selectedIds, setSelectedIds] = useState<string[]>(
    config?.selectedRoleIds ?? []
  );

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setMode(config?.mode ?? 'auto');
      setSelectedIds(config?.selectedRoleIds ?? []);
    }
  }, [open, config]);

  // Filter to only show roles that come before the current role (if specified)
  const currentRole = currentRoleId
    ? roles.find((r) => r.id === currentRoleId)
    : null;
  const availableRoles = currentRole
    ? roles.filter((r) => r.order < currentRole.order)
    : roles;

  const handleToggleRole = (roleId: string) => {
    setSelectedIds((prev) =>
      prev.includes(roleId)
        ? prev.filter((id) => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleSave = () => {
    onSave(mode, mode === 'custom' ? selectedIds : []);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">
            {t(
              'editor.workflow.previousRoles.title',
              'Seleccionar roles anteriores'
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode selector */}
          <div className="flex rounded-md border p-0.5 bg-muted/50">
            <button
              type="button"
              onClick={() => setMode('auto')}
              className={cn(
                'flex-1 px-3 py-1.5 text-xs font-medium rounded-sm transition-colors',
                mode === 'auto'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t('editor.workflow.previousRoles.auto', 'Automático')}
            </button>
            <button
              type="button"
              onClick={() => setMode('custom')}
              className={cn(
                'flex-1 px-3 py-1.5 text-xs font-medium rounded-sm transition-colors',
                mode === 'custom'
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {t('editor.workflow.previousRoles.custom', 'Personalizado')}
            </button>
          </div>

          {mode === 'auto' ? (
            <p className="text-xs text-muted-foreground">
              {t(
                'editor.workflow.previousRoles.autoDescription',
                'Se notificará automáticamente cuando todos los roles anteriores (según el orden) hayan firmado.'
              )}
            </p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">
                {t(
                  'editor.workflow.previousRoles.customDescription',
                  'Selecciona los roles que deben firmar antes de notificar:'
                )}
              </p>
              {availableRoles.length === 0 ? (
                <p className="text-xs text-muted-foreground/70 italic">
                  {t(
                    'editor.workflow.previousRoles.noRoles',
                    'No hay roles anteriores disponibles.'
                  )}
                </p>
              ) : (
                <ScrollArea className="max-h-48">
                  <div className="space-y-2">
                    {availableRoles
                      .sort((a, b) => a.order - b.order)
                      .map((role) => (
                        <div key={role.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`role-${role.id}`}
                            checked={selectedIds.includes(role.id)}
                            onCheckedChange={() => handleToggleRole(role.id)}
                          />
                          <Label
                            htmlFor={`role-${role.id}`}
                            className="text-xs cursor-pointer"
                          >
                            {role.label}{' '}
                            <span className="text-muted-foreground">
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

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            {t('common.cancel', 'Cancelar')}
          </Button>
          <Button size="sm" onClick={handleSave}>
            {t('common.apply', 'Aplicar')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
