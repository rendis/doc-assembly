import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { PaginationPlus } from 'tiptap-pagination-plus'
import { EditorToolbar } from './EditorToolbar'
import { PageSettings } from './PageSettings'
import { type PageSize, type PageMargins } from '../types'

interface DocumentEditorProps {
  initialContent?: string
  onContentChange?: (content: string) => void
  editable?: boolean
  pageSize: PageSize
  margins: PageMargins
  onPageSizeChange: (size: PageSize) => void
  onMarginsChange: (margins: PageMargins) => void
}

export function DocumentEditor({
  initialContent = '<p>Comienza a escribir...</p>',
  onContentChange,
  editable = true,
  pageSize,
  margins,
  onPageSizeChange,
  onMarginsChange,
}: DocumentEditorProps) {
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
        pageGap: 24,
        pageGapBorderSize: 1,
        pageGapBorderColor: 'hsl(220 13% 91%)',
        pageBreakBackground: 'hsl(220 14% 96%)',
        marginTop: margins.top,
        marginBottom: margins.bottom,
        marginLeft: margins.left,
        marginRight: margins.right,
        contentMarginTop: 10,
        contentMarginBottom: 10,
      }),
    ],
    content: initialContent,
    editable,
    onUpdate: ({ editor }) => {
      onContentChange?.(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px]',
      },
    },
  })

  if (!editor) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with Toolbar and Settings */}
      <div className="flex items-center justify-between border-b bg-card">
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
      <div className="flex-1 overflow-auto bg-muted/30 p-8">
        <div
          className="mx-auto bg-card shadow-sm rounded-sm"
          style={{ width: pageSize.width }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  )
}
