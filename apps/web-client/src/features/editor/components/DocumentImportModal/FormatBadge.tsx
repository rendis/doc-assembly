import { FileJson2, FileText, FileCode } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ImportableFormat } from './types';
import { SUPPORTED_FORMATS } from './types';

interface FormatBadgeProps {
  format: ImportableFormat;
  size?: 'sm' | 'md';
  disabled?: boolean;
}

const iconMap = {
  FileJson2,
  FileText,
  FileCode,
};

export function FormatBadge({ format, size = 'md', disabled }: FormatBadgeProps) {
  const config = SUPPORTED_FORMATS[format];
  const Icon = iconMap[config.icon as keyof typeof iconMap] || FileText;
  const isDisabled = disabled || config.disabled;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border font-medium',
        size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm',
        isDisabled
          ? 'border-muted bg-muted/50 text-muted-foreground'
          : 'border-primary/20 bg-primary/5 text-primary'
      )}
      title={isDisabled ? config.disabledMessage : config.label}
    >
      <Icon className={cn(size === 'sm' ? 'h-3 w-3' : 'h-4 w-4')} />
      {config.label}
      {isDisabled && <span className="text-[10px]">*</span>}
    </span>
  );
}
