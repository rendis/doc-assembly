import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { PaginationPlus, PAGE_SIZES as TIPTAP_PAGE_SIZES } from 'tiptap-pagination-plus'
import { useCallback, useEffect } from 'react'
import { PAGE_SIZES, DEFAULT_MARGINS, type PageSize, type PageMargins } from '../types'

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
    <div className="editor-container">
      <EditorContent editor={editor} />
    </div>
  )
}

// Export utilities for external use
export { PAGE_SIZES, DEFAULT_MARGINS }
export type { PageSize, PageMargins }
