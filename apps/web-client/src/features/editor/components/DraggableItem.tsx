import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface SidebarItemProps {
  label: string;
  icon?: LucideIcon;
  type: 'variable' | 'tool';
  description?: string;
  className?: string;
  style?: React.CSSProperties;
}

export const SidebarItem = ({ label, icon: Icon, type, description, className, style }: SidebarItemProps) => {
  return (
    <div
      style={style}
      title={description}
      className={cn(
        'flex items-center gap-2 p-2 text-sm border rounded-md cursor-grab bg-card shadow-sm hover:shadow-md transition-shadow select-none',
        type === 'tool' ? 'border-dashed border-muted-foreground/50' : 'border-border',
        className
      )}
    >
      {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      <span>{label}</span>
    </div>
  );
};

interface DraggableItemProps extends Omit<SidebarItemProps, 'className' | 'style'> {
  id: string;
  data: Record<string, unknown>;
}

export const DraggableItem = ({ id, data, label, icon, type, description }: DraggableItemProps) => {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id,
    data: { ...data, dndType: type },
  });

  return (
    <div ref={setNodeRef} {...listeners} {...attributes} className={isDragging ? 'opacity-50' : ''}>
       <SidebarItem label={label} icon={icon} type={type} description={description} />
    </div>
  );
};