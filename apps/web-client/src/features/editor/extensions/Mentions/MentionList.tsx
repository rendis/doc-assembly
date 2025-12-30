import { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings2 } from 'lucide-react';
import { VARIABLE_ICONS, ROLE_PROPERTY_ICONS, type MentionVariable } from './variables';
import { hasConfigurableOptions } from '../../types/injectable';

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

    // Separar items por grupo
    const { roleItems, variableItems } = useMemo(() => {
      const roles = items.filter((item) => item.group === 'role');
      const variables = items.filter((item) => item.group === 'variable');
      return { roleItems: roles, variableItems: variables };
    }, [items]);

    // Reset index when items change - standard reset-on-prop-change pattern
    const itemsLength = items.length;
    useEffect(() => {
      setSelectedIndex(0);
    }, [itemsLength]);

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

    // Renderizar un item de mención
    const renderItem = (item: MentionVariable, index: number) => {
      // Para roles, usar icono específico de propiedad; para variables, usar icono de tipo
      const Icon =
        item.isRoleVariable && item.propertyKey
          ? ROLE_PROPERTY_ICONS[item.propertyKey]
          : VARIABLE_ICONS[item.type];
      const hasOptions = hasConfigurableOptions(item.metadata);
      const isRole = item.group === 'role';

      return (
        <button
          key={item.id}
          data-index={index}
          onClick={() => selectItem(index)}
          className={cn(
            'flex items-center gap-2 w-full px-3 py-2 rounded-md text-left transition-colors',
            index === selectedIndex
              ? isRole
                ? 'bg-role-muted text-role-foreground dark:bg-role-muted dark:text-role-foreground'
                : 'bg-accent text-accent-foreground'
              : 'hover:bg-muted'
          )}
        >
          <Icon
            className={cn(
              'h-4 w-4 shrink-0',
              isRole
                ? index === selectedIndex
                  ? 'text-role-foreground'
                  : 'text-role'
                : 'text-muted-foreground'
            )}
          />
          <span
            className={cn(
              'text-sm truncate flex-1',
              isRole && 'text-role-foreground'
            )}
          >
            {item.label}
          </span>
          {hasOptions && (
            <Settings2 className="h-3 w-3 text-muted-foreground/70 shrink-0" />
          )}
          {!isRole && (
            <span className="text-xs text-muted-foreground">{item.type}</span>
          )}
        </button>
      );
    };

    // Calcular índices globales para cada sección
    let currentIndex = 0;

    return (
      <div className="bg-popover border rounded-lg shadow-lg w-72 p-1.5">
        <ScrollArea className="max-h-80" ref={containerRef}>
          {/* Sección: Roles de Firmantes */}
          {roleItems.length > 0 && (
            <>
              <div className="px-3 py-2 text-xs font-semibold text-role border-b border-role-border">
                Roles de Firmantes
              </div>
              <div className="pt-1 pb-1">
                {roleItems.map((item) => {
                  const index = currentIndex++;
                  return renderItem(item, index);
                })}
              </div>
            </>
          )}

          {/* Sección: Variables */}
          {variableItems.length > 0 && (
            <>
              <div
                className={cn(
                  'px-3 py-2 text-xs font-semibold text-muted-foreground border-b',
                  roleItems.length > 0 && 'mt-2'
                )}
              >
                Variables
              </div>
              <div className="pt-1 pb-1">
                {variableItems.map((item) => {
                  const index = currentIndex++;
                  return renderItem(item, index);
                })}
              </div>
            </>
          )}
        </ScrollArea>
      </div>
    );
  }
);

MentionList.displayName = 'MentionList';
