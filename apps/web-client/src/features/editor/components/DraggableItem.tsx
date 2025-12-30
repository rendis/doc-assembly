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
        // Estilos púrpura para role-variable
        isRoleVariant && [
          'border-violet-300/50 bg-violet-50 hover:bg-violet-100/80',
          'dark:border-violet-500/30 dark:bg-violet-950/30 dark:hover:bg-violet-900/40',
        ],
        !isRoleVariant && type === 'role-variable' && 'border-border bg-card',
        className
      )}
    >
      {Icon && (
        <Icon
          className={cn(
            'h-4 w-4',
            isRoleVariant ? 'text-violet-600 dark:text-violet-400' : 'text-muted-foreground'
          )}
        />
      )}
      <span
        className={cn(
          'flex-1 truncate',
          isRoleVariant && 'text-violet-700 dark:text-violet-300'
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