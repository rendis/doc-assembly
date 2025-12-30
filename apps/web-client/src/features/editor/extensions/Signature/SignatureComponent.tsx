import { useState, useCallback, useMemo } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
// @ts-expect-error - NodeViewProps is not exported in type definitions
import type { NodeViewProps } from '@tiptap/react';
import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EditorNodeContextMenu } from '../../components/EditorNodeContextMenu';
import { SignatureItemView } from './components/SignatureItemView';
import { SignatureEditor } from './components/SignatureEditor';
import type { SignatureBlockAttrs, SignatureCount, SignatureLayout, SignatureLineWidth } from './types';
import {
  getLayoutContainerClasses,
  getLayoutRowStructure,
  layoutNeedsRowStructure,
  getSignatureItemWidthClasses,
} from './signature-layouts';

export const SignatureComponent = (props: NodeViewProps) => {
  const { node, selected, deleteNode, updateAttributes } = props;

  // Extraer atributos con valores por defecto
  const count = (node.attrs.count ?? 1) as SignatureCount;
  const layout = (node.attrs.layout ?? 'single-center') as SignatureLayout;
  const lineWidth = (node.attrs.lineWidth ?? 'md') as SignatureLineWidth;
  const signatures = node.attrs.signatures ?? [];

  const attrs: SignatureBlockAttrs = {
    count,
    layout,
    lineWidth,
    signatures,
  };

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleDoubleClick = useCallback(() => {
    setEditorOpen(true);
  }, []);

  const handleEdit = useCallback(() => {
    setEditorOpen(true);
    setContextMenu(null);
  }, []);

  const handleSave = useCallback(
    (newAttrs: SignatureBlockAttrs) => {
      updateAttributes(newAttrs);
    },
    [updateAttributes]
  );

  const containerClasses = getLayoutContainerClasses(layout);
  const itemWidthClasses = getSignatureItemWidthClasses(count);
  const needsRowStructure = layoutNeedsRowStructure(layout);
  const rowStructure = useMemo(
    () => (needsRowStructure ? getLayoutRowStructure(layout) : null),
    [needsRowStructure, layout]
  );

  // Renderizar las firmas según el layout
  const renderSignatures = () => {
    if (rowStructure) {
      // Layouts con estructura de filas especial
      return (
        <div className="w-full flex flex-col gap-8">
          {rowStructure.rows.map((rowIndices, rowIndex) => (
            <div key={rowIndex} className={rowStructure.rowClasses[rowIndex]}>
              {rowIndices.map((sigIndex) => {
                const signature = signatures[sigIndex];
                if (!signature) return null;
                return (
                  <SignatureItemView
                    key={signature.id}
                    signature={signature}
                    lineWidth={lineWidth}
                    className={itemWidthClasses}
                  />
                );
              })}
            </div>
          ))}
        </div>
      );
    }

    // Layouts simples (sin estructura de filas)
    return signatures.map((signature: SignatureBlockAttrs['signatures'][0]) => (
      <SignatureItemView
        key={signature.id}
        signature={signature}
        lineWidth={lineWidth}
        className={itemWidthClasses}
      />
    ));
  };

  return (
    <NodeViewWrapper className="my-6">
      <div
        data-drag-handle
        contentEditable={false}
        onContextMenu={handleContextMenu}
        onDoubleClick={handleDoubleClick}
        className={cn(
          'relative w-full p-6 border-2 border-dashed rounded-lg transition-colors cursor-grab select-none',
          'bg-muted/20 hover:bg-muted/30',
          selected ? 'border-primary ring-2 ring-primary/20' : 'border-muted-foreground/30'
        )}
        style={{
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}
      >
        {/* Contenedor de firmas según layout */}
        <div className={containerClasses}>{renderSignatures()}</div>

        {/* Badge de edición flotante */}
        <div
          className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded bg-foreground/10 hover:bg-foreground/20 text-foreground text-[10px] font-medium border border-foreground/20 transition-all cursor-pointer shadow-sm"
          onClick={handleDoubleClick}
        >
          <Pencil className="h-3 w-3" />
          <span>Editar</span>
        </div>
      </div>

      {/* Context menu */}
      {contextMenu && (
        <EditorNodeContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          nodeType="signature"
          onDelete={deleteNode}
          onEdit={handleEdit}
          onClose={() => setContextMenu(null)}
        />
      )}

      {/* Editor dialog */}
      <SignatureEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        attrs={attrs}
        onSave={handleSave}
      />
    </NodeViewWrapper>
  );
};
