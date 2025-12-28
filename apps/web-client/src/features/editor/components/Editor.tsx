import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { EditorToolbar } from './EditorToolbar'

interface EditorProps {
  content: string
  onChange: (content: string) => void
  editable?: boolean
}

export const Editor = ({ content, onChange, editable = true }: EditorProps) => {
  const editor = useEditor({
    extensions: [StarterKit],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[400px] p-4 bg-white dark:bg-slate-900 dark:prose-invert max-w-none',
      },
    },
  })

  if (!editor) return null

  return (
    <div className="border rounded-lg overflow-hidden flex flex-col bg-white dark:bg-slate-900 dark:border-slate-700 shadow-sm">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}