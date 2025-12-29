/* eslint-disable react-hooks/set-state-in-effect -- Reset index on items change is a standard UI pattern */
import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VARIABLE_ICONS, type MentionVariable } from './variables';

export interface MentionListProps {
  items: MentionVariable[];
  command: (item: MentionVariable) => void;
}

export interface MentionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const MentionList = forwardRef<MentionListRef, MentionListProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    // Reset index when items change - standard reset-on-prop-change pattern
    useEffect(() => {
      setSelectedIndex(0);
    }, [items]);

    const selectItem = useCallback(
      (index: number) => {
        const item = items[index];
        if (item) {
          command(item);
        }
      },
      [items, command]
    );

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((prev) => (prev - 1 + items.length) % items.length);
          return true;
        }

        if (event.key === 'ArrowDown') {
          setSelectedIndex((prev) => (prev + 1) % items.length);
          return true;
        }

        if (event.key === 'Enter') {
          selectItem(selectedIndex);
          return true;
        }

        return false;
      },
    }));

    // Scroll selected item into view
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const selectedElement = container.querySelector(`[data-index="${selectedIndex}"]`);
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' });
      }
    }, [selectedIndex]);

    if (items.length === 0) {
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm text-muted-foreground">
          No se encontraron variables
        </div>
      );
    }

    return (
      <div className="bg-popover border rounded-lg shadow-lg overflow-hidden w-64">
        <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground border-b">
          Variables
        </div>
        <ScrollArea className="max-h-64" ref={containerRef}>
          <div className="p-1">
            {items.map((item, index) => {
              const Icon = VARIABLE_ICONS[item.type];
              return (
                <button
                  key={item.id}
                  data-index={index}
                  onClick={() => selectItem(index)}
                  className={cn(
                    'flex items-center gap-2 w-full px-2 py-1.5 rounded-md text-left transition-colors',
                    index === selectedIndex
                      ? 'bg-accent text-accent-foreground'
                      : 'hover:bg-muted'
                  )}
                >
                  <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate">{item.label}</span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {item.type}
                  </span>
                </button>
              );
            })}
          </div>
        </ScrollArea>
      </div>
    );
  }
);

MentionList.displayName = 'MentionList';
