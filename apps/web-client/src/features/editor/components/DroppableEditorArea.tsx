import { cn } from '@/lib/utils';
import { useDroppable } from '@dnd-kit/core';

interface DroppableEditorAreaProps {
  children: React.ReactNode;
  className?: string;
}

export function DroppableEditorArea({ children, className }: DroppableEditorAreaProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'editor-area',
  });

  return (
    <div 
      ref={setNodeRef} 
      className={cn(
        'transition-colors',
        isOver ? 'bg-primary/5 ring-2 ring-primary ring-inset rounded-lg' : '',
        className
      )}
    >
      {children}
    </div>
  );
}
