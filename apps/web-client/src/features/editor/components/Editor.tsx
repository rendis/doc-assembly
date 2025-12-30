import type { DragEndEvent, DragMoveEvent, DragStartEvent } from '@dnd-kit/core';
import { DndContext, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { EditorContent } from '@tiptap/react';
import { useState, useCallback, useEffect } from 'react';
import { EditorBubbleMenu } from '../extensions/BubbleMenu';
import { useEditorState } from '../hooks/useEditorState';
import { usePaginationStore } from '../stores/pagination-store';
import type { EditorProps } from '../types';
import { SidebarItem } from './DraggableItem';
import { DroppableEditorArea } from './DroppableEditorArea';
import { EditorSidebar } from './EditorSidebar';
import { EditorToolbar } from './EditorToolbar';
import { PageSettingsToolbar } from './PageSettingsToolbar';
import { ImageInsertModal, type ImageInsertResult } from './ImageInsertModal';
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

  const { config } = usePaginationStore();
  const format = config.format;

  const [activeDragItem, setActiveDragItem] = useState<DragData | null>(null);
  const [dropCursorPos, setDropCursorPos] = useState<{ top: number; left: number; height: number } | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [pendingImagePosition, setPendingImagePosition] = useState<number | null>(null);
  const [isEditingImage, setIsEditingImage] = useState(false);

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
        editor.chain().setSignature().run();
      } else if (data.id === 'tool_conditional') {
        editor.chain().setConditional({ expression: 'var > 0' }).run();
      } else if (data.id === 'tool_image') {
        setPendingImagePosition(pos?.pos ?? null);
        setImageModalOpen(true);
      }
    }
  };

  const handleImageInsert = useCallback((result: ImageInsertResult) => {
    if (!editor) return;

    if (isEditingImage) {
      // Update existing image attributes
      editor.chain().focus().updateAttributes('image', {
        src: result.src,
        alt: result.alt,
      }).run();
    } else {
      // Insert new image
      if (pendingImagePosition !== null) {
        editor.commands.focus(pendingImagePosition);
      }
      editor.chain().setImage({
        src: result.src,
        alt: result.alt,
      }).run();
    }

    setImageModalOpen(false);
    setPendingImagePosition(null);
    setIsEditingImage(false);
  }, [editor, pendingImagePosition, isEditingImage]);

  // Listen for custom events from slash commands and image toolbar
  useEffect(() => {
    if (!editor) return;

    const handleOpenImageModal = () => {
      setPendingImagePosition(editor.state.selection.from);
      setIsEditingImage(false);
      setImageModalOpen(true);
    };

    const handleEditImage = () => {
      setIsEditingImage(true);
      setImageModalOpen(true);
    };

    editor.view.dom.addEventListener('editor:open-image-modal', handleOpenImageModal);
    editor.view.dom.addEventListener('editor:edit-image', handleEditImage);
    return () => {
      editor.view.dom.removeEventListener('editor:open-image-modal', handleOpenImageModal);
      editor.view.dom.removeEventListener('editor:edit-image', handleEditImage);
    };
  }, [editor]);

  if (!editor) return null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full min-h-0 w-full border overflow-hidden bg-muted/30 shadow-sm">
        <EditorSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <EditorToolbar editor={editor} />
          <PageSettingsToolbar editor={editor} />
          <div
            className="editor-scroll-container"
            style={{
              '--page-width': `${format.width}px`,
              '--page-height': `${format.height}px`,
              '--page-margin': `${format.margins.top}px`,
              '--page-padding-v': `${format.margins.top}px`,
              '--page-padding-h': `${format.margins.left}px`,
            } as React.CSSProperties}
          >
            <DroppableEditorArea>
              <EditorContent editor={editor} />
              <EditorBubbleMenu editor={editor} />
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

      <ImageInsertModal
        open={imageModalOpen}
        onOpenChange={setImageModalOpen}
        onInsert={handleImageInsert}
      />
    </DndContext>
  );
};
