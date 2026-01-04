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
import { IMAGE_ALIGN_OPTIONS, type ImageDisplayMode, type ImageAlign } from './types';

interface ImageAlignSelectorProps {
  displayMode: ImageDisplayMode;
  align: ImageAlign;
  onChange: (displayMode: ImageDisplayMode, align: ImageAlign) => void;
}

const ICON_MAP = {
  'block-left': AlignLeft,
  'block-center': AlignCenter,
  'block-right': AlignRight,
  'inline-left': AlignStartVertical,
  'inline-right': AlignEndVertical,
} as const;

function getCurrentIcon(displayMode: ImageDisplayMode, align: ImageAlign) {
  const option = IMAGE_ALIGN_OPTIONS.find(
    (o) => o.displayMode === displayMode && o.align === align
  );
  return option ? ICON_MAP[option.icon] : AlignCenter;
}

export function ImageAlignSelector({
  displayMode,
  align,
  onChange,
}: ImageAlignSelectorProps) {
  const CurrentIcon = getCurrentIcon(displayMode, align);

  const handleSelect = useCallback(
    (option: (typeof IMAGE_ALIGN_OPTIONS)[number]) => {
      onChange(option.displayMode, option.align);
    },
    [onChange]
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <CurrentIcon className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-2" align="start">
        <div className="flex flex-col gap-1">
          <div className="text-xs text-muted-foreground px-2 py-1">Bloque</div>
          <div className="flex gap-1">
            {IMAGE_ALIGN_OPTIONS.filter((o) => o.displayMode === 'block').map((option) => {
              const Icon = ICON_MAP[option.icon];
              const isActive = displayMode === option.displayMode && align === option.align;
              return (
                <Button
                  key={option.icon}
                  variant="ghost"
                  size="icon"
                  className={cn('h-8 w-8', isActive && 'bg-accent')}
                  onClick={() => handleSelect(option)}
                  title={option.label}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              );
            })}
          </div>
          <div className="text-xs text-muted-foreground px-2 py-1 mt-1">Flotante</div>
          <div className="flex gap-1">
            {IMAGE_ALIGN_OPTIONS.filter((o) => o.displayMode === 'inline').map((option) => {
              const Icon = ICON_MAP[option.icon];
              const isActive = displayMode === option.displayMode && align === option.align;
              return (
                <Button
                  key={option.icon}
                  variant="ghost"
                  size="icon"
                  className={cn('h-8 w-8', isActive && 'bg-accent')}
                  onClick={() => handleSelect(option)}
                  title={option.label}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              );
            })}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
