import { useState, useRef } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
// @ts-ignore
import type { NodeViewProps } from '@tiptap/core';
import { cn } from '@/lib/utils';
import { PenTool } from 'lucide-react';
import { EditorNodeContextMenu } from '../../components/EditorNodeContextMenu';

export const SignatureComponent = (props: NodeViewProps) => {
  const { node, selected, deleteNode } = props;
  const { label, roleId } = node.attrs;

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const wasDragged = useRef(false);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleDragStart = () => {
    wasDragged.current = true;
  };

  const handleDragEnd = () => {
    // Keep wasDragged true so click handler knows a drag happened
  };

  const handleClick = (e: React.MouseEvent) => {
    if (wasDragged.current) {
      wasDragged.current = false;
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  return (
    <NodeViewWrapper className="my-4">
      <div
        data-drag-handle
        contentEditable={false}
        onClick={handleClick}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onContextMenu={handleContextMenu}
        className={cn(
          'w-full max-w-sm h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center bg-muted/30 transition-colors cursor-grab select-none',
          selected ? 'border-primary ring-2 ring-primary/20' : 'border-muted-foreground/30',
          'hover:bg-muted/50'
        )}
        style={{
          WebkitUserSelect: 'none',
          userSelect: 'none',
          WebkitTouchCallout: 'none',
        }}
      >
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <PenTool className="h-6 w-6" />
          <span className="font-medium text-sm">{label}</span>
          {roleId && <span className="text-xs bg-muted px-2 py-0.5 rounded">Rol: {roleId}</span>}
        </div>
        <div className="w-2/3 h-px bg-muted-foreground/30 mt-8" />
      </div>

      {contextMenu && (
        <EditorNodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeType="signature"
          onDelete={deleteNode}
          onClose={() => setContextMenu(null)}
        />
      )}
    </NodeViewWrapper>
  );
};
