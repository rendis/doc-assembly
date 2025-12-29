import { Trash2 } from 'lucide-react';
// @ts-expect-error - TipTap types compatibility
import type { Editor } from '@tiptap/core';

interface DragHandleMenuProps {
  editor: Editor;
  pos: number;
  nodeSize: number;
  onClose: () => void;
}

export const DragHandleMenu = ({ editor, pos, nodeSize, onClose }: DragHandleMenuProps) => {
  const deleteBlock = () => {
    editor.chain()
      .focus()
      .deleteRange({ from: pos, to: pos + nodeSize })
      .run();
    onClose();
  };

  return (
    <div className="flex flex-col py-1">
      <button
        onClick={deleteBlock}
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-destructive hover:bg-muted rounded-sm transition-colors"
      >
        <Trash2 className="h-4 w-4" />
        <span>Eliminar</span>
      </button>
    </div>
  );
};
