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
      data-dragging-over={isOver || undefined}
      className={cn('transition-colors', className)}
    >
      {children}
    </div>
  );
}
