import { useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
// @ts-expect-error - NodeViewProps is not exported in type definitions
import type { NodeViewProps } from '@tiptap/react';
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

  const Icon = icons[type as keyof typeof icons] || Type;

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  return (
    <NodeViewWrapper as="span" className="mx-1">
      <span
        contentEditable={false}
        onContextMenu={handleContextMenu}
        className={cn(
          'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-sm font-medium transition-colors select-none border',
          selected ? 'ring-2 ring-ring ring-offset-2' : '',
          // Light mode: blue
          'bg-primary/10 text-primary hover:bg-primary/20 border-primary/20',
          // Dark mode: info (cyan) with dashed border
          'dark:bg-info/15 dark:text-info dark:hover:bg-info/25 dark:border-dashed dark:border-info/50'
        )}
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
