/* eslint-disable react-hooks/rules-of-hooks */
import { useState, useCallback, useMemo, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { NodeViewWrapper, type NodeViewProps } from '@tiptap/react'
import { NodeSelection } from '@tiptap/pm/state'
import { Settings2, Trash2, PenLine } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
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
  const { node, selected, deleteNode, updateAttributes, editor, getPos } = props
  const { t } = useTranslation()

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

  const [editorOpen, setEditorOpen] = useState(false)
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [, forceUpdate] = useState({})

  // Subscribe to selection updates to properly track direct selection
  useEffect(() => {
    const handleSelectionUpdate = () => forceUpdate({})
    editor.on('selectionUpdate', handleSelectionUpdate)
    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate)
    }
  }, [editor])

  // Check if this specific node is directly selected (not just within a parent selection)
  const isDirectlySelected = useMemo(() => {
    if (!selected) return false
    const { selection } = editor.state
    const pos = getPos()
    // Verify it's a NodeSelection pointing to this exact node
    return (
      selection instanceof NodeSelection &&
      typeof pos === 'number' &&
      selection.anchor === pos
    )
  }, [selected, editor.state.selection, getPos])

  // Reset image selection when block selection changes or editor opens
  useEffect(() => {
    setSelectedImageId(null)
  }, [selected, editorOpen])

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setEditorOpen(true)
  }, [])

  const handleSelectNode = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const pos = getPos()
      if (typeof pos === 'number') {
        const tr = editor.state.tr.setSelection(
          NodeSelection.create(editor.state.doc, pos)
        )
        editor.view.dispatch(tr)
        editor.view.focus()
      }
    },
    [editor, getPos]
  )

  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      const pos = getPos()
      if (typeof pos === 'number') {
        const tr = editor.state.tr.setSelection(
          NodeSelection.create(editor.state.doc, pos)
        )
        editor.view.dispatch(tr)
        editor.commands.deleteSelection()
      }
    },
    [editor, getPos]
  )

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
                    editable={isDirectlySelected}
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
        editable={isDirectlySelected}
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
        contentEditable={false}
        onClick={handleSelectNode}
        onDoubleClick={handleDoubleClick}
        className={cn(
          'relative w-full p-6 border-2 border-dashed rounded-lg transition-colors select-none',
          isDirectlySelected
            ? 'bg-info-muted/40 dark:bg-info-muted/20'
            : 'bg-info-muted/20 dark:bg-info-muted/10 hover:bg-info-muted/30 dark:hover:bg-info-muted/15'
        )}
        style={{
          borderColor: isDirectlySelected
            ? 'hsl(var(--info-border))'
            : 'hsl(var(--info-border) / 0.6)',
          WebkitUserSelect: 'none',
          userSelect: 'none',
        }}
      >
        {/* Zonas de arrastre en los bordes */}
        <div data-drag-handle className="absolute inset-x-0 top-0 h-3 cursor-grab" />
        <div data-drag-handle className="absolute inset-x-0 bottom-0 h-3 cursor-grab" />
        <div data-drag-handle className="absolute inset-y-0 left-0 w-3 cursor-grab" />
        <div data-drag-handle className="absolute inset-y-0 right-0 w-3 cursor-grab" />

        {/* Tab decorativo superior izquierdo */}
        <div data-drag-handle onDoubleClick={handleDoubleClick} className="absolute -top-3 left-4 z-10 cursor-grab">
          <div
            className={cn(
              'px-2 h-6 bg-card flex items-center gap-1.5 text-xs font-medium border rounded shadow-sm transition-colors',
              isDirectlySelected
                ? 'text-info-foreground border-info-border dark:text-info dark:border-info'
                : 'text-muted-foreground border-border hover:border-info-border hover:text-info-foreground dark:hover:border-info dark:hover:text-info'
            )}
          >
            <PenLine className="h-3.5 w-3.5" />
            <span>{t('editor.signature.title')}</span>
          </div>
        </div>

        {/* Contenedor de firmas según layout */}
        <div className={containerClasses}>{renderSignatures()}</div>

        {/* Barra de herramientas flotante cuando está seleccionado */}
        {isDirectlySelected && (
          <TooltipProvider delayDuration={300}>
            <div data-toolbar className="absolute -top-10 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-background border rounded-lg shadow-lg p-1 z-50">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleDoubleClick}
                  >
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{t('editor.signature.edit')}</p>
                </TooltipContent>
              </Tooltip>
              <div className="w-px h-6 bg-border mx-1" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={handleDelete}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{t('editor.signature.delete')}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        )}

      </div>

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
