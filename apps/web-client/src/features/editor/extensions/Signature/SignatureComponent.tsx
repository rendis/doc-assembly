import { NodeViewWrapper } from '@tiptap/react';
// @ts-ignore
import type { NodeViewProps } from '@tiptap/core';
import { cn } from '@/lib/utils';
import { PenTool } from 'lucide-react';

export const SignatureComponent = (props: NodeViewProps) => {
  const { node, selected } = props;
  const { label, roleId } = node.attrs;

  return (
    <NodeViewWrapper className="my-4">
      <div
        className={cn(
          'w-full max-w-sm h-32 border-2 border-dashed rounded-lg flex flex-col items-center justify-center bg-muted/30 transition-colors',
          selected ? 'border-primary ring-2 ring-primary/20' : 'border-muted-foreground/30',
          'hover:bg-muted/50'
        )}
      >
        <div className="flex flex-col items-center gap-2 text-muted-foreground">
          <PenTool className="h-6 w-6" />
          <span className="font-medium text-sm">{label}</span>
          {roleId && <span className="text-xs bg-muted px-2 py-0.5 rounded">Rol: {roleId}</span>}
        </div>
        <div className="w-2/3 h-px bg-muted-foreground/30 mt-8" />
      </div>
    </NodeViewWrapper>
  );
};
