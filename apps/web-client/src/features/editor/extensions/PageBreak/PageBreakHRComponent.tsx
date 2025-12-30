import { useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
// @ts-expect-error - NodeViewProps is not exported in type definitions
import type { NodeViewProps } from '@tiptap/react';
import { cn } from '@/lib/utils';
import { EditorNodeContextMenu } from '../../components/EditorNodeContextMenu';

export const PageBreakHRComponent = (props: NodeViewProps) => {
  const { selected, deleteNode } = props;
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  return (
    <NodeViewWrapper>
      <div
        data-drag-handle
        contentEditable={false}
        onContextMenu={handleContextMenu}
        className={cn(
          'page-break-node cursor-grab select-none my-6',
          selected && 'outline outline-2 outline-primary outline-offset-2'
        )}
        style={{
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}
      >
        {/* Solo línea punteada */}
        <div
          className={cn(
            'w-full border-t-2 border-dashed transition-colors',
            selected ? 'border-primary' : 'border-border'
          )}
        />
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
