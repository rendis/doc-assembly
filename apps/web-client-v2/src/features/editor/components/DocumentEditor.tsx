import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { PaginationPlus } from 'tiptap-pagination-plus'
import { EditorToolbar } from './EditorToolbar'
import { PageSettings } from './PageSettings'
import { SignerRolesPanel } from './SignerRolesPanel'
import { SignerRolesProvider } from '../context/SignerRolesContext'
import { InjectorExtension } from '../extensions/Injector'
import { SignatureExtension } from '../extensions/Signature'
import { ConditionalExtension } from '../extensions/Conditional'
import { MentionExtension } from '../extensions/Mentions'
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
        marginTop: margins.top,
        marginBottom: margins.bottom,
        marginLeft: margins.left,
        marginRight: margins.right,
        pageGap: 24,
        headerLeft: '',
        headerRight: '',
        footerLeft: '',
        footerRight: '',
      }),
      InjectorExtension,
      MentionExtension,
      SignatureExtension,
      ConditionalExtension,
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
          <div className="flex items-center justify-between border-b border-gray-100 bg-white">
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
          <div className="flex-1 overflow-auto bg-[#F5F5F5] p-8">
            <div
              className="mx-auto bg-white shadow-sm rounded-sm"
              style={{ width: pageSize.width }}
            >
              <EditorContent editor={editor} />
            </div>
          </div>
        </div>

        {/* Right: Signer Roles Panel */}
        <SignerRolesPanel
          variables={variables}
          className="w-72 shrink-0 border-l border-gray-100"
        />
      </div>
    </SignerRolesProvider>
  )
}
