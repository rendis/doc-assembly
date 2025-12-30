import { cn } from '@/lib/utils';
import { AlignLeft, AlignCenter, AlignRight, WrapText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ImageDisplayMode, ImageAlign } from './types';

interface ImageAlignSelectorProps {
  displayMode: ImageDisplayMode;
  align: ImageAlign;
  onChange: (displayMode: ImageDisplayMode, align: ImageAlign) => void;
}

interface AlignOption {
  displayMode: ImageDisplayMode;
  align: ImageAlign;
  icon: React.ReactNode;
  label: string;
}

const ALIGN_OPTIONS: AlignOption[] = [
  {
    displayMode: 'block',
    align: 'left',
    icon: <AlignLeft className="h-4 w-4" />,
    label: 'Bloque izquierda',
  },
  {
    displayMode: 'block',
    align: 'center',
    icon: <AlignCenter className="h-4 w-4" />,
    label: 'Bloque centro',
  },
  {
    displayMode: 'block',
    align: 'right',
    icon: <AlignRight className="h-4 w-4" />,
    label: 'Bloque derecha',
  },
  {
    displayMode: 'inline',
    align: 'left',
    icon: (
      <div className="relative h-4 w-4">
        <WrapText className="h-4 w-4" />
      </div>
    ),
    label: 'Flotante izquierda',
  },
  {
    displayMode: 'inline',
    align: 'right',
    icon: (
      <div className="relative h-4 w-4 scale-x-[-1]">
        <WrapText className="h-4 w-4" />
      </div>
    ),
    label: 'Flotante derecha',
  },
];

export function ImageAlignSelector({
  displayMode,
  align,
  onChange,
}: ImageAlignSelectorProps) {
  const isActive = (option: AlignOption) =>
    option.displayMode === displayMode && option.align === align;

  return (
    <div className="flex items-center gap-0.5">
      {ALIGN_OPTIONS.map((option) => (
        <Button
          key={`${option.displayMode}-${option.align}`}
          variant="ghost"
          size="icon"
          className={cn(
            'h-8 w-8',
            isActive(option) && 'bg-accent text-accent-foreground'
          )}
          onClick={() => onChange(option.displayMode, option.align)}
          title={option.label}
        >
          {option.icon}
        </Button>
      ))}
    </div>
  );
}
