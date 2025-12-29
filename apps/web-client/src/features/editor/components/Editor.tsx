import { useState } from 'react';
import { EditorContent } from '@tiptap/react';
import { EditorToolbar } from './EditorToolbar';
import { useEditorState } from '../hooks/useEditorState';
import { EditorSidebar } from './EditorSidebar';
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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragItem(event.active.data.current);
  };

  const handleDragMove = (event: DragMoveEvent) => {
    if (!editor) return;

    // Calcular posición actual del puntero
    // @ts-ignore
    const clientX = event.activatorEvent.clientX + event.delta.x;
    // @ts-ignore
    const clientY = event.activatorEvent.clientY + event.delta.y;

    const pos = editor.view.posAtCoords({ left: clientX, top: clientY });
    
    if (pos) {
      // Obtener coordenadas visuales para el cursor falso
      const coords = editor.view.coordsAtPos(pos.pos);
      // Ajustar coordenadas relativas al viewport si es necesario, 
      // pero coordsAtPos devuelve coordenadas de cliente (viewport), lo cual es perfecto para un div fixed/absolute global
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

    // We assume the drop target is the editor area. 
    // In a real implementation, we might check if over.id matches the editor container.
    
    // Map coordinates to editor position
    // event.delta gives the translation. We need absolute client coordinates for posAtCoords.
    // However, dnd-kit events don't strictly give the final mouse client coordinates in a way 
    // that maps 1:1 to what posAtCoords expects if scrolling happens. 
    // A simpler approach for this prototype is inserting at the current selection or 
    // if we want to be fancy, we try to use the approximate drop location.
    
    // For now, let's try to get the position from the event if possible, 
    // otherwise fallback to current selection.
    
    // NOTE: In a robust app, we'd use a custom Droppable that tracks mouse position
    // or use the 'over' data if we made the editor lines droppable.
    
    const data = active.data.current;
    if (!data) return;

    // Use the coordinates from the drop event to find the position in the editor
    // @ts-ignore - dnd-kit types are sometimes tricky with deeply nested event props, but clientX/Y usually exist on the original event
    const clientX = event.activatorEvent.clientX + event.delta.x;
    // @ts-ignore
    const clientY = event.activatorEvent.clientY + event.delta.y;

    const pos = editor.view.posAtCoords({ left: clientX, top: clientY });
    
    if (pos) {
      editor.commands.focus(pos.pos);
    }

    if (data.dndType === 'variable') {
      editor.chain().setInjector({ 
        type: data.type, // This is 'TEXT', 'DATE' etc from MOCK_VARIABLES
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
          className="fixed z-50 pointer-events-none transition-all duration-75 ease-out"
          style={{
            top: dropCursorPos.top,
            left: dropCursorPos.left - 2, // Centrar (-2px para ancho de 4px)
            height: dropCursorPos.height,
          }}
        >
          {/* Línea vertical */}
          <div className="h-full w-[4px] bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
          {/* Cabezal/Círculo superior */}
          <div className="absolute -top-1.5 -left-1 w-3 h-3 bg-blue-500 rounded-full shadow-sm ring-2 ring-background" />
        </div>
      )}
    </DndContext>
  );
};
