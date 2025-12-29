import { NodeViewWrapper } from '@tiptap/react';
// @ts-ignore
import type { NodeViewProps } from '@tiptap/core';
import { cn } from '@/lib/utils';
import { Calendar, CheckSquare, Coins, Hash, Image as ImageIcon, Table, Type } from 'lucide-react';

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
  const { node, selected } = props;
  const { label, type } = node.attrs;
  
  const Icon = icons[type as keyof typeof icons] || Type;

  return (
    <NodeViewWrapper as="span" className="inline-flex items-baseline mx-1 align-middle">
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-sm font-medium transition-colors cursor-pointer select-none',
          selected ? 'ring-2 ring-ring ring-offset-2' : '',
          'bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20'
        )}
      >
        <Icon className="h-3 w-3" />
        {label || 'Variable'}
      </span>
    </NodeViewWrapper>
  );
};
