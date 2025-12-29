import { DragHandle } from '@tiptap/extension-drag-handle-react';
import { offset, flip, shift } from '@floating-ui/dom';
import { GripVertical } from 'lucide-react';

interface EditorDragHandleProps {
  editor: any;
}

export const EditorDragHandle = ({ editor }: EditorDragHandleProps) => {
  return (
    <DragHandle
      editor={editor}
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
      <div className="drag-handle">
        <GripVertical className="h-4 w-4" />
      </div>
    </DragHandle>
  );
};
