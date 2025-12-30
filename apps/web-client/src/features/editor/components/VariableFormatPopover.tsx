/* eslint-disable react-hooks/set-state-in-effect -- Sync external props to local state is a standard UI pattern */
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import type { Variable } from '../data/variables';
import { getAvailableFormats, getDefaultFormat } from '../types/injectable';

export interface VariableFormatPopoverProps {
  variable: Variable | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (format: string) => void;
  onCancel: () => void;
  /** Position coordinates (unused with Dialog, kept for API compatibility) */
  position?: { x: number; y: number };
}

export const VariableFormatPopover = ({
  variable,
  open,
  onOpenChange,
  onSelect,
  onCancel,
}: VariableFormatPopoverProps) => {
  const { t } = useTranslation();
  const formats = variable ? getAvailableFormats(variable.metadata) : [];
  const defaultFormat = variable ? getDefaultFormat(variable.metadata) : undefined;
  const [selectedFormat, setSelectedFormat] = useState<string>(defaultFormat || formats[0] || '');

  // Reset selection when variable changes
  useEffect(() => {
    if (variable) {
      const newDefault = getDefaultFormat(variable.metadata) || getAvailableFormats(variable.metadata)[0] || '';
      setSelectedFormat(newDefault);
    }
  }, [variable]);

  const handleSelect = () => {
    if (selectedFormat) {
      onSelect(selectedFormat);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // User closed the dialog (escape, click outside, etc.) - treat as cancel
      onCancel();
    }
    onOpenChange(newOpen);
  };

  if (!variable || formats.length === 0) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[360px]">
        <DialogHeader>
          <DialogTitle className="text-base">
            {t('editor.variables.selectFormat', 'Seleccionar formato')}
          </DialogTitle>
          <DialogDescription>
            {variable.label}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Label htmlFor="format-select" className="text-sm">
            {t('editor.variables.formatOptions', 'Opciones de formato')}
          </Label>
          <Select value={selectedFormat} onValueChange={setSelectedFormat}>
            <SelectTrigger id="format-select" className="w-full">
              <SelectValue placeholder={t('editor.variables.selectFormat', 'Seleccionar formato')} />
            </SelectTrigger>
            <SelectContent>
              {formats.map((format) => (
                <SelectItem key={format} value={format}>
                  <span className="font-mono text-sm">{format}</span>
                  {format === defaultFormat && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      ({t('common.default', 'default')})
                    </span>
                  )}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            {t('common.cancel', 'Cancelar')}
          </Button>
          <Button size="sm" onClick={handleSelect}>
            {t('editor.variables.select', 'Seleccionar')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
