import type { DragEndEvent, DragMoveEvent, DragStartEvent } from '@dnd-kit/core';
import { DndContext, DragOverlay, MouseSensor, TouchSensor, useSensor, useSensors } from '@dnd-kit/core';
import { EditorContent } from '@tiptap/react';
import { useState, useCallback, useEffect } from 'react';
import { EditorBubbleMenu } from '../extensions/BubbleMenu';
import { useEditorState } from '../hooks/useEditorState';
import { usePaginationStore } from '../stores/pagination-store';
import { useEditorStore } from '../stores/editor-store';
import type { EditorProps } from '../types';
import { SidebarItem } from './DraggableItem';
import { DroppableEditorArea } from './DroppableEditorArea';
import { EditorSidebar } from './EditorSidebar';
import { EditorToolbar } from './EditorToolbar';
import { PageSettingsToolbar } from './PageSettingsToolbar';
import { ImageInsertModal, type ImageInsertResult } from './ImageInsertModal';
import { VariableFormatPopover } from './VariableFormatPopover';
import type { InjectorType, Variable } from '../data/variables';
import type { LucideIcon } from 'lucide-react';
import {
  hasConfigurableOptions,
  getDefaultFormat,
  type InjectableMetadata,
} from '../types/injectable';
import type { RolePropertyKey } from '../types/role-injectable';

interface DragData {
  id: string;
  label: string;
  icon: LucideIcon;
  dndType: 'variable' | 'tool' | 'role-variable';
  type?: InjectorType;
  variableId?: string;
  metadata?: InjectableMetadata;
  // Propiedades para role injectables
  isRoleInjectable?: boolean;
  roleId?: string;
  roleLabel?: string;
  propertyKey?: RolePropertyKey;
}

interface PendingVariable {
  variable: Variable;
  position: number;
  pointerCoords: { x: number; y: number };
}

export const Editor = ({ content, onChange, editable = true, onEditorReady }: EditorProps) => {
  const { editor } = useEditorState({
    content,
    editable,
    onUpdate: onChange,
  });

  // Notify parent when editor is ready
  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  // Set editor in global store for cross-component access
  const setEditorInStore = useEditorStore((state) => state.setEditor);
  useEffect(() => {
    setEditorInStore(editor);
    return () => setEditorInStore(null);
  }, [editor, setEditorInStore]);

  const { config } = usePaginationStore();
  const format = config.format;

  const [activeDragItem, setActiveDragItem] = useState<DragData | null>(null);
  const [dropCursorPos, setDropCursorPos] = useState<{ top: number; left: number; height: number } | null>(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);
  const [pendingImagePosition, setPendingImagePosition] = useState<number | null>(null);
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [editingImageShape, setEditingImageShape] = useState<'square' | 'circle'>('square');

  // Variable format popover state
  const [formatPopoverOpen, setFormatPopoverOpen] = useState(false);
  const [pendingVariable, setPendingVariable] = useState<PendingVariable | null>(null);

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
      // Check if variable has configurable options
      if (hasConfigurableOptions(data.metadata)) {
        // Store pending variable and open format popover
        const variable: Variable = {
          id: data.id,
          variableId: data.variableId || data.id,
          label: data.label,
          type: data.type || 'TEXT',
          metadata: data.metadata,
        };
        setPendingVariable({
          variable,
          position: pos?.pos ?? editor.state.selection.from,
          pointerCoords: {
            x: pointer.clientX + event.delta.x,
            y: pointer.clientY + event.delta.y,
          },
        });
        setFormatPopoverOpen(true);
      } else {
        // Insert directly with default format
        const defaultFormat = getDefaultFormat(data.metadata);
        editor.chain().setInjector({
          type: data.type || 'TEXT',
          label: data.label,
          variableId: data.variableId,
          format: defaultFormat || null,
        }).run();
      }
    } else if (data.dndType === 'role-variable' && data.isRoleInjectable) {
      // Insertar role injectable (variable de rol de firmante)
      editor.chain().setInjector({
        type: 'ROLE_TEXT',
        label: data.label,
        variableId: data.variableId,
        isRoleVariable: true,
        roleId: data.roleId,
        roleLabel: data.roleLabel,
        propertyKey: data.propertyKey,
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

  // Handle format selection from popover
  const handleFormatSelect = useCallback((format: string) => {
    if (!editor || !pendingVariable) return;

    editor.commands.focus(pendingVariable.position);
    editor.chain().setInjector({
      type: pendingVariable.variable.type,
      label: pendingVariable.variable.label,
      variableId: pendingVariable.variable.variableId,
      format,
    }).run();

    setFormatPopoverOpen(false);
    setPendingVariable(null);
  }, [editor, pendingVariable]);

  // Handle cancel from format popover
  const handleFormatCancel = useCallback(() => {
    setFormatPopoverOpen(false);
    setPendingVariable(null);
  }, []);

  const handleImageInsert = useCallback((result: ImageInsertResult) => {
    if (!editor) return;

    if (isEditingImage) {
      // Update existing image attributes
      const updateAttrs: Record<string, unknown> = {
        src: result.src,
        alt: result.alt,
      };
      // If shape was set during cropping, update it too
      if (result.shape) {
        updateAttrs.shape = result.shape;
      }
      editor.chain().focus().updateAttributes('image', updateAttrs).run();
    } else {
      // Insert new image
      if (pendingImagePosition !== null) {
        editor.commands.focus(pendingImagePosition);
      }
      editor.chain().setImage({
        src: result.src,
        alt: result.alt,
        shape: result.shape,
      }).run();
    }

    setImageModalOpen(false);
    setPendingImagePosition(null);
    setIsEditingImage(false);
    setEditingImageShape('square');
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
      // Get the shape from the currently selected image node
      const { selection } = editor.state;
      const node = editor.state.doc.nodeAt(selection.from);
      const shape = node?.attrs?.shape || 'square';
      setEditingImageShape(shape);
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

  // Listen for variable format selection events from @mentions
  useEffect(() => {
    if (!editor) return;

    const handleSelectVariableFormat = (event: CustomEvent<{ variable: Variable; range: { from: number; to: number } }>) => {
      const { variable, range } = event.detail;

      // Delete the @mention text
      editor.chain().focus().deleteRange(range).run();

      // Get cursor position for popover
      const coords = editor.view.coordsAtPos(editor.state.selection.from);

      // Store pending variable and open format popover
      setPendingVariable({
        variable,
        position: editor.state.selection.from,
        pointerCoords: { x: coords.left, y: coords.top },
      });
      setFormatPopoverOpen(true);
    };

    editor.view.dom.addEventListener(
      'editor:select-variable-format',
      handleSelectVariableFormat as EventListener
    );
    return () => {
      editor.view.dom.removeEventListener(
        'editor:select-variable-format',
        handleSelectVariableFormat as EventListener
      );
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
        shape={isEditingImage ? editingImageShape : 'square'}
      />

      <VariableFormatPopover
        variable={pendingVariable?.variable ?? null}
        open={formatPopoverOpen}
        onOpenChange={setFormatPopoverOpen}
        onSelect={handleFormatSelect}
        onCancel={handleFormatCancel}
        position={pendingVariable?.pointerCoords}
      />
    </DndContext>
  );
};
