import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Type,
  Hash,
  Calendar,
  Coins,
  CheckSquare,
  User,
  Mail,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PreviewVariable, VariableValue } from '../../types/preview';
import type { InjectorType } from '../../data/variables';

interface VariableInputModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variables: PreviewVariable[];
  initialValues: Record<string, VariableValue>;
  onSubmit: (values: Record<string, VariableValue>) => void;
  onCancel: () => void;
}

const TYPE_ICONS: Record<InjectorType, typeof Type> = {
  TEXT: Type,
  NUMBER: Hash,
  DATE: Calendar,
  CURRENCY: Coins,
  BOOLEAN: CheckSquare,
  IMAGE: Type,
  TABLE: Type,
  ROLE_TEXT: User,
};

const PROPERTY_ICONS: Record<string, typeof User> = {
  name: User,
  email: Mail,
};

export const VariableInputModal = ({
  open,
  onOpenChange,
  variables,
  initialValues,
  onSubmit,
  onCancel,
}: VariableInputModalProps) => {
  const { t } = useTranslation();
  const [values, setValues] = useState<Record<string, VariableValue>>(initialValues);
  const [prevOpen, setPrevOpen] = useState(open);

  // Reset values when modal opens (render-time state update pattern)
  if (open && !prevOpen) {
    setValues({ ...initialValues });
    setPrevOpen(true);
  } else if (!open && prevOpen) {
    setPrevOpen(false);
  }

  // Separate variables by type
  const { roleVariables, regularVariables, internalVariables } = useMemo(() => {
    const role: PreviewVariable[] = [];
    const regular: PreviewVariable[] = [];
    const internal: PreviewVariable[] = [];

    for (const v of variables) {
      if (v.isInternal) {
        internal.push(v);
      } else if (v.isRoleVariable) {
        role.push(v);
      } else {
        regular.push(v);
      }
    }

    return { roleVariables: role, regularVariables: regular, internalVariables: internal };
  }, [variables]);

  // Group role variables by role
  const roleGroups = useMemo(() => {
    const groups: Record<string, PreviewVariable[]> = {};
    for (const v of roleVariables) {
      const key = v.roleLabel || 'Unknown';
      if (!groups[key]) groups[key] = [];
      groups[key].push(v);
    }
    return groups;
  }, [roleVariables]);

  const handleValueChange = (variableId: string, value: string | boolean) => {
    const variable = variables.find((v) => v.variableId === variableId);
    const displayValue =
      typeof value === 'boolean' ? (value ? 'true' : 'false') : String(value);

    setValues((prev) => ({
      ...prev,
      [variableId]: {
        variableId,
        value,
        displayValue,
        format: variable?.format || undefined,
      },
    }));
  };

  const handleSubmit = () => {
    onSubmit(values);
  };

  const renderInput = (variable: PreviewVariable) => {
    const currentValue = values[variable.variableId]?.value ?? '';

    switch (variable.type) {
      case 'BOOLEAN':
        return (
          <div className="flex items-center gap-2">
            <Switch
              id={variable.variableId}
              checked={currentValue === true || currentValue === 'true'}
              onCheckedChange={(checked: boolean) =>
                handleValueChange(variable.variableId, checked)
              }
            />
            <Label htmlFor={variable.variableId} className="text-sm text-muted-foreground">
              {currentValue === true || currentValue === 'true' ? 'Verdadero' : 'Falso'}
            </Label>
          </div>
        );

      case 'NUMBER':
        return (
          <Input
            id={variable.variableId}
            type="number"
            value={String(currentValue)}
            onChange={(e) => handleValueChange(variable.variableId, e.target.value)}
            placeholder={`Ingrese ${variable.label}`}
            className="h-9"
          />
        );

      case 'DATE':
        return (
          <Input
            id={variable.variableId}
            type="date"
            value={String(currentValue)}
            onChange={(e) => handleValueChange(variable.variableId, e.target.value)}
            className="h-9"
          />
        );

      case 'CURRENCY':
        return (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
              $
            </span>
            <Input
              id={variable.variableId}
              type="number"
              step="0.01"
              value={String(currentValue)}
              onChange={(e) => handleValueChange(variable.variableId, e.target.value)}
              placeholder="0.00"
              className="h-9 pl-7"
            />
          </div>
        );

      default:
        return (
          <Input
            id={variable.variableId}
            type="text"
            value={String(currentValue)}
            onChange={(e) => handleValueChange(variable.variableId, e.target.value)}
            placeholder={`Ingrese ${variable.label}`}
            className="h-9"
          />
        );
    }
  };

  const renderVariableRow = (variable: PreviewVariable, showIcon = true) => {
    const Icon = variable.propertyKey
      ? PROPERTY_ICONS[variable.propertyKey] || TYPE_ICONS[variable.type]
      : TYPE_ICONS[variable.type];

    return (
      <div key={variable.variableId} className="space-y-1.5">
        <div className="flex items-center gap-2">
          {showIcon && <Icon className="h-4 w-4 text-muted-foreground" />}
          <Label htmlFor={variable.variableId} className="text-sm font-medium">
            {variable.label}
          </Label>
          {variable.format && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {variable.format}
            </span>
          )}
        </div>
        {renderInput(variable)}
      </div>
    );
  };

  const hasVariables = variables.length > 0;
  const hasRegular = regularVariables.length > 0;
  const hasRoles = Object.keys(roleGroups).length > 0;
  const hasInternal = internalVariables.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {t('editor.preview.inputVariables', 'Ingresar Valores de Variables')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'editor.preview.inputVariablesDescription',
              'Complete los valores para las variables del documento antes de generar la vista previa.'
            )}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="space-y-6 py-4">
            {/* Internal variables (auto-filled) */}
            {hasInternal && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                  <Sparkles className="h-4 w-4" />
                  <span>{t('editor.preview.autoFilledVariables', 'Variables Automáticas')}</span>
                </div>
                <div className="space-y-3 pl-6">
                  {internalVariables.map((v) => {
                    const value = values[v.variableId]?.displayValue || '';
                    return (
                      <div
                        key={v.variableId}
                        className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-md"
                      >
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">{v.label}</span>
                        </div>
                        <span className="text-sm font-mono text-muted-foreground">
                          {value}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Role variables grouped by role */}
            {hasRoles && (
              <div className="space-y-4">
                <div className="text-sm font-medium text-muted-foreground">
                  {t('editor.preview.roleVariables', 'Variables de Roles')}
                </div>
                {Object.entries(roleGroups).map(([roleLabel, vars]) => (
                  <div
                    key={roleLabel}
                    className={cn(
                      'space-y-3 p-3 rounded-lg border',
                      'border-violet-200 bg-violet-50/50 dark:border-violet-800 dark:bg-violet-950/20'
                    )}
                  >
                    <div className="flex items-center gap-2 text-sm font-medium text-violet-700 dark:text-violet-300">
                      <User className="h-4 w-4" />
                      <span>{roleLabel}</span>
                    </div>
                    <div className="space-y-3 pl-2">
                      {vars.map((v) => renderVariableRow(v, true))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Regular variables */}
            {hasRegular && (
              <div className="space-y-3">
                {(hasRoles || hasInternal) && (
                  <div className="text-sm font-medium text-muted-foreground">
                    {t('editor.preview.documentVariables', 'Variables del Documento')}
                  </div>
                )}
                <div className="space-y-4">
                  {regularVariables.map((v) => renderVariableRow(v, true))}
                </div>
              </div>
            )}

            {!hasVariables && (
              <div className="text-center py-8 text-muted-foreground">
                {t('editor.preview.noVariables', 'No hay variables que completar.')}
              </div>
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onCancel}>
            {t('common.cancel', 'Cancelar')}
          </Button>
          <Button onClick={handleSubmit}>
            {t('editor.preview.continue', 'Continuar')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
