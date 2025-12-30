import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { Settings2 } from 'lucide-react';

export interface SidebarItemProps {
  label: string;
  icon?: LucideIcon;
  type: 'variable' | 'tool' | 'role-variable';
  /** Variante visual: 'role' usa colores púrpura para role injectables */
  variant?: 'default' | 'role';
  description?: string;
  hasConfigurableOptions?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const SidebarItem = ({
  label,
  icon: Icon,
  type,
  variant = 'default',
  description,
  hasConfigurableOptions,
  className,
  style,
}: SidebarItemProps) => {
  const isRoleVariant = type === 'role-variable' && variant === 'role';

  return (
    <div
      style={style}
      title={description}
      className={cn(
        'flex items-center gap-2 p-2 text-sm border rounded-md cursor-grab shadow-sm hover:shadow-md transition-shadow select-none',
        type === 'tool' && 'border-dashed border-muted-foreground/50 bg-card',
        type === 'variable' && 'border-border bg-card',
        // Estilos teal para role-variable
        isRoleVariant && [
          'border-role-border/50 bg-role-muted hover:bg-role-muted/80',
          'dark:border-role-border dark:bg-role-muted dark:hover:bg-role-muted/80',
        ],
        !isRoleVariant && type === 'role-variable' && 'border-border bg-card',
        className
      )}
    >
      {Icon && (
        <Icon
          className={cn(
            'h-4 w-4',
            isRoleVariant ? 'text-role-foreground dark:text-role-foreground' : 'text-muted-foreground'
          )}
        />
      )}
      <span
        className={cn(
          'flex-1 truncate',
          isRoleVariant && 'text-role-foreground'
        )}
      >
        {label}
      </span>
      {hasConfigurableOptions && (
        <Settings2 className="h-3 w-3 text-muted-foreground/70 shrink-0" />
      )}
    </div>
  );
};

interface DraggableItemProps extends Omit<SidebarItemProps, 'className' | 'style'> {
  id: string;
  data: Record<string, unknown>;
}

export const DraggableItem = ({
  id,
  data,
  label,
  icon,
  type,
  variant,
  description,
  hasConfigurableOptions,
}: DraggableItemProps) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data: { ...data, dndType: type },
  });

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={isDragging ? 'opacity-50' : ''}>
      <SidebarItem
        label={label}
        icon={icon}
        type={type}
        variant={variant}
        description={description}
        hasConfigurableOptions={hasConfigurableOptions}
      />
    </div>
  );
};