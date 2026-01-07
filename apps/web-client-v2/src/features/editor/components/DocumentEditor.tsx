import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { TextStyle, FontFamily, FontSize } from '@tiptap/extension-text-style'
import { useState, useEffect, useCallback } from 'react'
import { PaginationPlus } from 'tiptap-pagination-plus'
import { EditorToolbar } from './EditorToolbar'
import { PageSettings } from './PageSettings'
import { SignerRolesPanel } from './SignerRolesPanel'
import { SignerRolesProvider } from '../context/SignerRolesContext'
import { InjectorExtension } from '../extensions/Injector'
import { SignatureExtension } from '../extensions/Signature'
import { ConditionalExtension } from '../extensions/Conditional'
import { MentionExtension } from '../extensions/Mentions'
import { ImageExtension, type ImageShape } from '../extensions/Image'
import { PageBreakHR } from '../extensions/PageBreak'
import { SlashCommandsExtension, slashCommandsSuggestion } from '../extensions/SlashCommands'
import { ImageInsertModal, type ImageInsertResult } from './ImageInsertModal'
import { type PageSize, type PageMargins, type Variable } from '../types'

interface DocumentEditorProps {
  initialContent?: string
  onContentChange?: (content: string) => void
  editable?: boolean
  pageSize: PageSize
  margins: PageMargins
  onPageSizeChange: (size: PageSize) => void
  onMarginsChange: (margins: PageMargins) => void
  variables?: Variable[]
}

export function DocumentEditor({
  initialContent = '<p>Comienza a escribir...</p>',
  onContentChange,
  editable = true,
  pageSize,
  margins,
  onPageSizeChange,
  onMarginsChange,
  variables = [],
}: DocumentEditorProps) {
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
      TextStyle,
      FontFamily.configure({ types: ['textStyle'] }),
      FontSize.configure({ types: ['textStyle'] }),
      PaginationPlus.configure({
        pageHeight: pageSize.height,
        pageWidth: pageSize.width,
        marginTop: margins.top,
        marginBottom: margins.bottom,
        marginLeft: margins.left,
        marginRight: margins.right,
        pageGap: 50,
        pageGapBorderSize: 2,
        pageGapBorderColor: '#d1d5db',
        pageBreakBackground: '#f3f4f6',
        footerRight: '{page}',
      }),
      InjectorExtension,
      MentionExtension,
      SignatureExtension,
      ConditionalExtension,
      ImageExtension,
      PageBreakHR,
      SlashCommandsExtension.configure({
        suggestion: slashCommandsSuggestion,
      }),
    ],
    content: initialContent,
    editable,
    onUpdate: ({ editor }) => {
      onContentChange?.(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class:
          'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px]',
      },
    },
  })

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

    const { src, shape } = result

    if (isEditingImage) {
      // Update existing image
      editor.chain().focus().updateAttributes('customImage', {
        src,
        shape,
      }).run()
    } else {
      // Insert new image
      if (pendingImagePosition !== null) {
        editor.chain().focus().setTextSelection(pendingImagePosition).run()
      }
      editor.chain().focus().setImage({
        src,
        shape,
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
    <SignerRolesProvider variables={variables}>
      <div className="flex h-full">
        {/* Left: Main Editor Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header with Toolbar and Settings */}
          <div className="flex items-center justify-between border-b border-border bg-card">
            <EditorToolbar editor={editor} />
            <div className="pr-2">
              <PageSettings
                pageSize={pageSize}
                margins={margins}
                onPageSizeChange={onPageSizeChange}
                onMarginsChange={onMarginsChange}
              />
            </div>
          </div>

          {/* Editor Content */}
          <div className="flex-1 overflow-auto bg-muted/20 p-8">
            <div
              className="mx-auto"
              style={{ width: pageSize.width }}
            >
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>

        {/* Right: Signer Roles Panel */}
        <SignerRolesPanel
          variables={variables}
          className="w-72 shrink-0 border-l border-border"
        />
      </div>

      <ImageInsertModal
        open={imageModalOpen}
        onOpenChange={handleImageModalClose}
        onInsert={handleImageInsert}
        initialShape={isEditingImage ? editingImageShape : 'square'}
      />
    </SignerRolesProvider>
  )
}
