import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { PageExtension, PageDocument } from '@adalat-ai/page-extension'
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

  // Convert pixel margins to inches (96 DPI)
  const pxToInches = (px: number) => px / 96

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        document: false, // PageDocument replaces this
        heading: {
          levels: [1, 2, 3],
        },
      }),
      PageDocument,
      PageExtension.configure({
        bodyHeight: pageSize.height,
        bodyWidth: pageSize.width,
        pageLayout: {
          margins: {
            top: { unit: 'INCHES', value: pxToInches(margins.top) },
            bottom: { unit: 'INCHES', value: pxToInches(margins.bottom) },
            left: { unit: 'INCHES', value: pxToInches(margins.left) },
            right: { unit: 'INCHES', value: pxToInches(margins.right) },
          },
        },
        headerHeight: 0,
        footerHeight: 0,
        pageNumber: {
          show: false,
          showCount: false,
          showOnFirstPage: false,
          position: null,
          alignment: null,
        },
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

  // Note: Page size and margins are set on editor initialization
  // To update them dynamically, the editor would need to be recreated

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
