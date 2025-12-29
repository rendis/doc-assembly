import { useState, useRef } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
// @ts-ignore
import type { NodeViewProps } from '@tiptap/core';
import { cn } from '@/lib/utils';
import { Calendar, CheckSquare, Coins, Hash, Image as ImageIcon, Table, Type } from 'lucide-react';
import { EditorNodeContextMenu } from '../../components/EditorNodeContextMenu';

const icons = {
  TEXT: Type,
  NUMBER: Hash,
  DATE: Calendar,
  CURRENCY: Coins,
  BOOLEAN: CheckSquare,
  IMAGE: ImageIcon,
  TABLE: Table,
};

export const InjectorComponent = (props: NodeViewProps) => {
  const { node, selected, deleteNode } = props;
  const { label, type } = node.attrs;

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const wasDragged = useRef(false);

  const Icon = icons[type as keyof typeof icons] || Type;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleDragStart = () => {
    wasDragged.current = true;
  };

  const handleDragEnd = () => {
    // Keep wasDragged true so mouseUp knows a drag happened
  };

  const handleClick = (e: React.MouseEvent) => {
    // If a drag just happened, don't show menu
    if (wasDragged.current) {
      wasDragged.current = false;
      return;
    }

    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  return (
    <NodeViewWrapper as="span" className="inline-flex items-baseline mx-1 align-middle">
      <span
        data-drag-handle
        contentEditable={false}
        onClick={handleClick}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onContextMenu={handleContextMenu}
        className={cn(
          'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-sm font-medium transition-colors cursor-grab select-none',
          selected ? 'ring-2 ring-ring ring-offset-2' : '',
          'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20'
        )}
        style={{
          WebkitUserSelect: 'none',
          userSelect: 'none',
          WebkitTouchCallout: 'none',
        }}
      >
        <Icon className="h-3 w-3" />
        {label || 'Variable'}
      </span>

      {contextMenu && (
        <EditorNodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeType="injector"
          onDelete={deleteNode}
          onClose={() => setContextMenu(null)}
        />
      )}
    </NodeViewWrapper>
  );
};
