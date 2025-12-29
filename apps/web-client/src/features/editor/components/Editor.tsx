import { useState, useEffect } from 'react';
import { EditorContent } from '@tiptap/react';
import { EditorToolbar } from './EditorToolbar';
import { useEditorState } from '../hooks/useEditorState';
import { EditorSidebar } from './EditorSidebar';
import { EditorBubbleMenu } from '../extensions/BubbleMenu';
import { EditorDragHandle } from './EditorDragHandle';
import { DndContext, DragOverlay, useSensor, useSensors, MouseSensor, TouchSensor } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent, DragMoveEvent } from '@dnd-kit/core';
import { DroppableEditorArea } from './DroppableEditorArea';
import { SidebarItem } from './DraggableItem';
import type { EditorProps } from '../types';

export const Editor = ({ content, onChange, editable = true }: EditorProps) => {
  const { editor } = useEditorState({
    content,
    editable,
    onUpdate: onChange,
  });

  const [activeDragItem, setActiveDragItem] = useState<any>(null);
  const [dropCursorPos, setDropCursorPos] = useState<{ top: number; left: number; height: number } | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor)
  );

  // Escuchar eventos DOM para drag interno de TipTap
  useEffect(() => {
    if (!editor) return;

    const handleEditorDragOver = (event: DragEvent) => {
      const pos = editor.view.posAtCoords({ left: event.clientX, top: event.clientY });
      if (pos) {
        const coords = editor.view.coordsAtPos(pos.pos);
        setDropCursorPos({
          top: coords.top,
          left: coords.left,
          height: coords.bottom - coords.top
        });
      }
    };

    const handleEditorDrop = () => {
      setDropCursorPos(null);
    };

    const handleEditorDragLeave = (event: DragEvent) => {
      // Solo limpiar si realmente salió del editor
      const relatedTarget = event.relatedTarget as Node | null;
      if (!relatedTarget || !editor.view.dom.contains(relatedTarget)) {
        setDropCursorPos(null);
      }
    };

    const editorDOM = editor.view.dom;
    editorDOM.addEventListener('dragover', handleEditorDragOver);
    editorDOM.addEventListener('drop', handleEditorDrop);
    editorDOM.addEventListener('dragleave', handleEditorDragLeave);

    return () => {
      editorDOM.removeEventListener('dragover', handleEditorDragOver);
      editorDOM.removeEventListener('drop', handleEditorDrop);
      editorDOM.removeEventListener('dragleave', handleEditorDragLeave);
    };
  }, [editor]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragItem(event.active.data.current);
  };

  const handleDragMove = (event: DragMoveEvent) => {
    if (!editor) return;

    // @ts-ignore
    const clientX = event.activatorEvent.clientX + event.delta.x;
    // @ts-ignore
    const clientY = event.activatorEvent.clientY + event.delta.y;

    const pos = editor.view.posAtCoords({ left: clientX, top: clientY });

    if (pos) {
      const coords = editor.view.coordsAtPos(pos.pos);
      setDropCursorPos({
        top: coords.top,
        left: coords.left,
        height: coords.bottom - coords.top
      });
    } else {
      setDropCursorPos(null);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setDropCursorPos(null);
    const { active, over } = event;
    setActiveDragItem(null);

    if (!editor || !over) return;

    const data = active.data.current;
    if (!data) return;

    // @ts-ignore
    const clientX = event.activatorEvent.clientX + event.delta.x;
    // @ts-ignore
    const clientY = event.activatorEvent.clientY + event.delta.y;

    const pos = editor.view.posAtCoords({ left: clientX, top: clientY });

    if (pos) {
      editor.commands.focus(pos.pos);
    }

    if (data.dndType === 'variable') {
      editor.chain().setInjector({
        type: data.type,
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
      <div className="flex h-[calc(100vh-100px)] w-full border rounded-lg overflow-hidden bg-muted/30 shadow-sm">
        <EditorSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <EditorToolbar editor={editor} />
          <div className="flex-1 overflow-y-auto bg-muted/20 p-8">
            <DroppableEditorArea className="min-h-full">
              <div className="max-w-[850px] mx-auto bg-card shadow-md min-h-[1000px]">
                <EditorContent editor={editor} />
                <EditorBubbleMenu editor={editor} />
                <EditorDragHandle editor={editor} />
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

      {/* Indicador de drop - overlay sin afectar flujo del documento */}
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
