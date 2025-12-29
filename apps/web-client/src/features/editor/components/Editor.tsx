import type { DragEndEvent, DragMoveEvent, DragStartEvent } from '@dnd-kit/core';
import { DndContext, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { EditorContent } from '@tiptap/react';
import { useState } from 'react';
import { EditorBubbleMenu } from '../extensions/BubbleMenu';
import { useEditorState } from '../hooks/useEditorState';
import type { EditorProps } from '../types';
import { SidebarItem } from './DraggableItem';
import { DroppableEditorArea } from './DroppableEditorArea';
import { EditorSidebar } from './EditorSidebar';
import { EditorToolbar } from './EditorToolbar';
import type { InjectorType } from '../data/variables';
import type { LucideIcon } from 'lucide-react';

interface DragData {
  id: string;
  label: string;
  icon: LucideIcon;
  dndType: 'variable' | 'tool';
  type?: InjectorType;
  variableId?: string;
}

export const Editor = ({ content, onChange, editable = true }: EditorProps) => {
  const { editor } = useEditorState({
    content,
    editable,
    onUpdate: onChange,
  });

  const [activeDragItem, setActiveDragItem] = useState<DragData | null>(null);
  const [dropCursorPos, setDropCursorPos] = useState<{ top: number; left: number; height: number } | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor)
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragItem(event.active.data.current as DragData);
  };

  const handleDragMove = (event: DragMoveEvent) => {
    if (!editor) return;

    // Get current pointer position
    const pointer = event.activatorEvent as PointerEvent;
    const x = pointer.clientX + event.delta.x;
    const y = pointer.clientY + event.delta.y;

    // Get position in editor at pointer coordinates
    const pos = editor.view.posAtCoords({ left: x, top: y });

    if (pos) {
      // Get visual coordinates for the drop cursor
      const coords = editor.view.coordsAtPos(pos.pos);
      setDropCursorPos({
        top: coords.top,
        left: coords.left,
        height: coords.bottom - coords.top,
      });
    } else {
      setDropCursorPos(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);
    setDropCursorPos(null);

    if (!editor || !over) return;

    const data = active.data.current as DragData;
    if (!data) return;

    // Calculate drop position from pointer coordinates
    const pointer = event.activatorEvent as PointerEvent;
    const pos = editor.view.posAtCoords({
      left: pointer.clientX + event.delta.x,
      top: pointer.clientY + event.delta.y,
    });

    if (pos) {
      editor.commands.focus(pos.pos);
    }

    // Insert appropriate node type
    if (data.dndType === 'variable') {
      editor.chain().setInjector({
        type: data.type || 'TEXT',
        label: data.label,
        variableId: data.variableId
      }).run();
    } else if (data.dndType === 'tool') {
      if (data.id === 'tool_signature') {
        editor.chain().setSignature({ roleId: 'signer_1', label: 'Firma Principal' }).run();
      } else if (data.id === 'tool_conditional') {
        editor.chain().setConditional({ expression: 'var > 0' }).run();
      } else if (data.id === 'tool_image') {
         const url = window.prompt('URL de la imagen:', 'https://via.placeholder.com/150');
         if (url) {
           editor.chain().setImage({ src: url }).run();
         }
      }
    }
  };

  if (!editor) return null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full min-h-0 w-full border rounded-lg overflow-hidden bg-muted/30 shadow-sm">
        <EditorSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <EditorToolbar editor={editor} />
          <div className="flex-1 overflow-y-auto bg-muted/20 p-8">
            <DroppableEditorArea className="min-h-full">
              <div className="max-w-[850px] mx-auto bg-card shadow-md min-h-[1000px]">
                <EditorContent editor={editor} />
                <EditorBubbleMenu editor={editor} />
              </div>
            </DroppableEditorArea>
          </div>
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeDragItem ? (
          <div className="opacity-80 rotate-2 cursor-grabbing pointer-events-none">
             <SidebarItem
               label={activeDragItem.label}
               icon={activeDragItem.icon}
               type={activeDragItem.dndType === 'tool' ? 'tool' : 'variable'}
             />
          </div>
        ) : null}
      </DragOverlay>

      {dropCursorPos && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            top: dropCursorPos.top,
            left: dropCursorPos.left - 2,
            height: dropCursorPos.height,
          }}
        >
          <div className="h-full w-[4px] bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
          <div className="absolute -top-1.5 -left-1 w-3 h-3 bg-blue-500 rounded-full shadow-sm ring-2 ring-background" />
        </div>
      )}
    </DndContext>
  );
};
