import { useCallback } from 'react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import {
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignEndVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { IMAGE_ALIGN_OPTIONS, type ImageAlignOption, type ImageDisplayMode } from '../types';

interface ImagePositionSelectorProps {
  currentType: ImageDisplayMode;
  currentPosition: 'left' | 'center' | 'right';
  onSelect: (option: ImageAlignOption) => void;
}

const ICON_MAP = {
  'block-left': AlignLeft,
  'block-center': AlignCenter,
  'block-right': AlignRight,
  'inline-left': AlignStartVertical,
  'inline-right': AlignEndVertical,
} as const;

function getCurrentIcon(type: ImageDisplayMode, position: string) {
  if (type === 'block') {
    const iconKey = `block-${position}` as keyof typeof ICON_MAP;
    return ICON_MAP[iconKey] || AlignCenter;
  } else {
    const iconKey = `inline-${position}` as keyof typeof ICON_MAP;
    return ICON_MAP[iconKey] || AlignStartVertical;
  }
}

const blockOptions = IMAGE_ALIGN_OPTIONS.filter((o) => o.displayMode === 'block');
const inlineOptions = IMAGE_ALIGN_OPTIONS.filter((o) => o.displayMode === 'inline');

export function ImagePositionSelector({
  currentType,
  currentPosition,
  onSelect,
}: ImagePositionSelectorProps) {
  const CurrentIcon = getCurrentIcon(currentType, currentPosition);

  const isActive = useCallback(
    (option: ImageAlignOption) => {
      return option.displayMode === currentType && option.align === currentPosition;
    },
    [currentType, currentPosition]
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8" title="Posición de imagen">
          <CurrentIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="flex flex-col gap-2">
          {/* Block options */}
          <div className="flex flex-col gap-1">
            <div className="text-xs text-muted-foreground px-2">Bloque</div>
            <div className="flex gap-1">
              {blockOptions.map((option) => {
                const Icon = ICON_MAP[option.icon];
                return (
                  <Button
                    key={option.icon}
                    variant="ghost"
                    size="icon"
                    className={cn('h-8 w-8', isActive(option) && 'bg-accent')}
                    onClick={() => onSelect(option)}
                    title={option.label}
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Separator */}
          <div className="h-px bg-border" />

          {/* Inline/Float options */}
          <div className="flex flex-col gap-1">
            <div className="text-xs text-muted-foreground px-2">Flotante</div>
            <div className="flex gap-1">
              {inlineOptions.map((option) => {
                const Icon = ICON_MAP[option.icon];
                return (
                  <Button
                    key={option.icon}
                    variant="ghost"
                    size="icon"
                    className={cn('h-8 w-8', isActive(option) && 'bg-accent')}
                    onClick={() => onSelect(option)}
                    title={option.label}
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
