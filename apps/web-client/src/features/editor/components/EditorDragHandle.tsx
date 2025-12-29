import { useState } from 'react';
import { DragHandle } from '@tiptap/extension-drag-handle-react';
// @ts-expect-error - TipTap types compatibility
import type { Editor } from '@tiptap/core';
import { offset, flip, shift } from '@floating-ui/dom';
import { GripVertical } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { DragHandleMenu } from './DragHandleMenu';

interface EditorDragHandleProps {
  editor: Editor;
}

export const EditorDragHandle = ({ editor }: EditorDragHandleProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentNode, setCurrentNode] = useState<{ pos: number; nodeSize: number } | null>(null);

  return (
    <DragHandle
      editor={editor}
      onNodeChange={({ node, pos }) => {
        if (node) {
          setCurrentNode({ pos, nodeSize: node.nodeSize });
        }
      }}
      computePositionConfig={{
        placement: 'left',
        strategy: 'fixed',
        middleware: [
          offset({ mainAxis: 10, crossAxis: 0 }),
          flip({ padding: 8 }),
          shift({ padding: 8 }),
        ],
      }}
    >
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <button className="drag-handle">
            <GripVertical className="h-4 w-4" />
          </button>
        </PopoverTrigger>
        <PopoverContent side="left" align="start" className="w-auto p-0">
          {currentNode && (
            <DragHandleMenu
              editor={editor}
              pos={currentNode.pos}
              nodeSize={currentNode.nodeSize}
              onClose={() => setIsOpen(false)}
            />
          )}
        </PopoverContent>
      </Popover>
    </DragHandle>
  );
};
