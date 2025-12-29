import { useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
// @ts-expect-error - NodeViewProps is not exported in type definitions
import type { NodeViewProps } from '@tiptap/react';
import { cn } from '@/lib/utils';
import { Scissors } from 'lucide-react';
import { EditorNodeContextMenu } from '../../components/EditorNodeContextMenu';

export const PageBreakComponent = (props: NodeViewProps) => {
  const { selected, deleteNode } = props;

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  return (
    <NodeViewWrapper className="my-6">
      <div
        data-drag-handle
        contentEditable={false}
        onContextMenu={handleContextMenu}
        className={cn(
          'page-break-node relative flex items-center justify-center py-3 cursor-grab select-none',
          'before:absolute before:left-0 before:right-0 before:top-1/2 before:h-px',
          'before:border-t-2 before:border-dashed',
          selected
            ? 'before:border-primary bg-primary/5'
            : 'before:border-muted-foreground/30 hover:before:border-muted-foreground/50'
        )}
        style={{
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}
      >
        <div
          className={cn(
            'relative z-10 flex items-center gap-2 px-3 py-1 text-xs rounded-full bg-background border',
            selected
              ? 'border-primary text-primary'
              : 'border-muted-foreground/30 text-muted-foreground'
          )}
        >
          <Scissors className="h-3 w-3" />
          <span>Salto de página</span>
        </div>
      </div>

      {contextMenu && (
        <EditorNodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeType="pageBreak"
          onDelete={deleteNode}
          onClose={() => setContextMenu(null)}
        />
      )}
    </NodeViewWrapper>
  );
};
