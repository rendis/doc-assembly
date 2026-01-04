import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { PaginationPlus, PAGE_SIZES as TIPTAP_PAGE_SIZES } from 'tiptap-pagination-plus'
import { useCallback, useEffect, useState } from 'react'
import { PAGE_SIZES, DEFAULT_MARGINS, type PageSize, type PageMargins } from '../types'
import { ImageExtension, type ImageShape } from '../extensions/Image'
import { ImageInsertModal, type ImageInsertResult } from './ImageInsertModal'

interface EditorProps {
  content?: string
  onUpdate?: (content: string) => void
  pageSize?: PageSize
  margins?: PageMargins
  editable?: boolean
}

export function Editor({
  content = '',
  onUpdate,
  pageSize = PAGE_SIZES.A4,
  margins = DEFAULT_MARGINS,
  editable = true,
}: EditorProps) {
  const [imageModalOpen, setImageModalOpen] = useState(false)
  const [isEditingImage, setIsEditingImage] = useState(false)
  const [pendingImagePosition, setPendingImagePosition] = useState<number | null>(null)
  const [editingImageShape, setEditingImageShape] = useState<ImageShape>('square')

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      PaginationPlus.configure({
        pageHeight: pageSize.height,
        pageWidth: pageSize.width,
        pageGap: 20,
        pageGapBorderSize: 1,
        pageGapBorderColor: 'hsl(var(--border))',
        pageBreakBackground: 'hsl(var(--muted))',
        marginTop: margins.top,
        marginBottom: margins.bottom,
        marginLeft: margins.left,
        marginRight: margins.right,
        contentMarginTop: 10,
        contentMarginBottom: 10,
      }),
      ImageExtension,
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onUpdate?.(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none',
      },
    },
  })

  // Update page size when prop changes
  useEffect(() => {
    if (editor) {
      editor.chain().focus().updatePageSize({
        width: pageSize.width,
        height: pageSize.height,
      }).run()
    }
  }, [editor, pageSize])

  // Update margins when prop changes
  useEffect(() => {
    if (editor) {
      editor.chain().focus().updateMargins(margins).run()
    }
  }, [editor, margins])

  // Listen for image modal events
  useEffect(() => {
    if (!editor) return

    const handleOpenImageModal = () => {
      setPendingImagePosition(editor.state.selection.from)
      setIsEditingImage(false)
      setImageModalOpen(true)
    }

    const handleEditImage = (event: CustomEvent<{ shape: ImageShape }>) => {
      setEditingImageShape(event.detail?.shape || 'square')
      setIsEditingImage(true)
      setImageModalOpen(true)
    }

    const dom = editor.view.dom
    dom.addEventListener('editor:open-image-modal', handleOpenImageModal)
    dom.addEventListener('editor:edit-image', handleEditImage as EventListener)

    return () => {
      dom.removeEventListener('editor:open-image-modal', handleOpenImageModal)
      dom.removeEventListener('editor:edit-image', handleEditImage as EventListener)
    }
  }, [editor])

  const handleImageInsert = useCallback((result: ImageInsertResult) => {
    if (!editor) return

    if (isEditingImage) {
      // Update existing image
      editor.chain().focus().updateAttributes('customImage', {
        src: result.src,
        shape: result.shape,
      }).run()
    } else {
      // Insert new image
      if (pendingImagePosition !== null) {
        editor.chain().focus().setTextSelection(pendingImagePosition).run()
      }
      editor.chain().focus().setImage({
        src: result.src,
        shape: result.shape,
      }).run()
    }

    setImageModalOpen(false)
    setIsEditingImage(false)
    setPendingImagePosition(null)
  }, [editor, isEditingImage, pendingImagePosition])

  const handleImageModalClose = useCallback((open: boolean) => {
    if (!open) {
      setImageModalOpen(false)
      setIsEditingImage(false)
      setPendingImagePosition(null)
    }
  }, [])

  const updatePageSize = useCallback((size: PageSize) => {
    if (editor) {
      editor.chain().focus().updatePageSize({
        width: size.width,
        height: size.height,
      }).run()
    }
  }, [editor])

  const updateMargins = useCallback((newMargins: PageMargins) => {
    if (editor) {
      editor.chain().focus().updateMargins(newMargins).run()
    }
  }, [editor])

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <>
      <div className="editor-container">
        <EditorContent editor={editor} />
      </div>

      <ImageInsertModal
        open={imageModalOpen}
        onOpenChange={handleImageModalClose}
        onInsert={handleImageInsert}
        initialShape={isEditingImage ? editingImageShape : 'square'}
      />
    </>
  )
}

// Export utilities for external use
export { PAGE_SIZES, DEFAULT_MARGINS }
export type { PageSize, PageMargins }
