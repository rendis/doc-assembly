/* eslint-disable react-hooks/rules-of-hooks */
import { useState, useCallback, useMemo, useEffect } from 'react'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EditorNodeContextMenu } from '../../components/EditorNodeContextMenu'
import { SignatureItemView } from './components/SignatureItemView'
import { SignatureEditor } from './components/SignatureEditor'
import type {
  SignatureBlockAttrs,
  SignatureCount,
  SignatureItem,
  SignatureLayout,
  SignatureLineWidth,
} from './types'
import {
  getLayoutContainerClasses,
  getLayoutRowStructure,
  layoutNeedsRowStructure,
  getSignatureItemWidthClasses,
} from './signature-layouts'

export const SignatureComponent = (props: NodeViewProps) => {
  const { node, selected, deleteNode, updateAttributes } = props

  // Extraer atributos con valores por defecto
  const count = (node.attrs.count ?? 1) as SignatureCount
  const layout = (node.attrs.layout ?? 'single-center') as SignatureLayout
  const lineWidth = (node.attrs.lineWidth ?? 'md') as SignatureLineWidth
  const signatures = useMemo(
    () => (node.attrs.signatures ?? []) as SignatureItem[],
    [node.attrs.signatures]
  )

  const attrs: SignatureBlockAttrs = {
    count,
    layout,
    lineWidth,
    signatures,
  }

  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
  } | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)

  // Reset image selection when block selection changes or editor opens
  useEffect(() => {
    setSelectedImageId(null)
  }, [selected, editorOpen])

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }

  const handleDoubleClick = useCallback(() => {
    setEditorOpen(true)
  }, [])

  const handleEdit = useCallback(() => {
    setEditorOpen(true)
    setContextMenu(null)
  }, [])

  const handleSave = useCallback(
    (newAttrs: SignatureBlockAttrs) => {
      updateAttributes(newAttrs)
    },
    [updateAttributes]
  )

  const handleImageTransformChange = useCallback(
    (
      signatureId: string,
      transform: Partial<
        Pick<
          SignatureItem,
          'imageRotation' | 'imageScale' | 'imageX' | 'imageY'
        >
      >
    ) => {
      const updatedSignatures = signatures.map((sig: SignatureItem) =>
        sig.id === signatureId ? { ...sig, ...transform } : sig
      )
      updateAttributes({ signatures: updatedSignatures })
    },
    [signatures, updateAttributes]
  )

  const containerClasses = getLayoutContainerClasses(layout)
  const itemWidthClasses = getSignatureItemWidthClasses(count)
  const needsRowStructure = layoutNeedsRowStructure(layout)
  const rowStructure = useMemo(
    () => (needsRowStructure ? getLayoutRowStructure(layout) : null),
    [needsRowStructure, layout]
  )

  // Renderizar las firmas según el layout
  const renderSignatures = () => {
    if (rowStructure) {
      // Layouts con estructura de filas especial
      return (
        <div className="w-full flex flex-col gap-8">
          {rowStructure.rows.map((rowIndices, rowIndex) => (
            <div key={rowIndex} className={rowStructure.rowClasses[rowIndex]}>
              {rowIndices.map((sigIndex) => {
                const signature = signatures[sigIndex]
                if (!signature) return null
                return (
                  <SignatureItemView
                    key={signature.id}
                    signature={signature}
                    lineWidth={lineWidth}
                    className={itemWidthClasses}
                    editable={selected}
                    isImageSelected={selectedImageId === signature.id}
                    onImageSelect={() => setSelectedImageId(signature.id)}
                    onImageDeselect={() => setSelectedImageId(null)}
                    onImageTransformChange={(transform) =>
                      handleImageTransformChange(signature.id, transform)
                    }
                  />
                )
              })}
            </div>
          ))}
        </div>
      )
    }

    // Layouts simples (sin estructura de filas)
    return signatures.map((signature: SignatureBlockAttrs['signatures'][0]) => (
      <SignatureItemView
        key={signature.id}
        signature={signature}
        lineWidth={lineWidth}
        className={itemWidthClasses}
        editable={selected}
        isImageSelected={selectedImageId === signature.id}
        onImageSelect={() => setSelectedImageId(signature.id)}
        onImageDeselect={() => setSelectedImageId(null)}
        onImageTransformChange={(transform) =>
          handleImageTransformChange(signature.id, transform)
        }
      />
    ))
  }

  return (
    <NodeViewWrapper className="my-6">
      <div
        data-drag-handle
        contentEditable={false}
        onContextMenu={handleContextMenu}
        onDoubleClick={handleDoubleClick}
        className={cn(
          'relative w-full p-6 border-2 border-dashed rounded-lg transition-colors cursor-grab select-none',
          selected
            ? 'bg-info-muted/40 dark:bg-info-muted/20'
            : 'bg-info-muted/20 dark:bg-info-muted/10 hover:bg-info-muted/30 dark:hover:bg-info-muted/15'
        )}
        style={{
          borderColor: selected
            ? 'hsl(var(--info-border))'
            : 'hsl(var(--info-border) / 0.6)',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}
      >
        {/* Contenedor de firmas según layout */}
        <div className={containerClasses}>{renderSignatures()}</div>

        {/* Badge de edición flotante */}
        <div
          className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded bg-background/80 hover:bg-background text-info-foreground dark:text-info text-[10px] font-medium border border-info-border transition-all cursor-pointer shadow-sm backdrop-blur-sm"
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
  )
}
