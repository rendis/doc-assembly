import { Editor as TiptapEditor } from '@tiptap/react'
import { 
  Bold, Italic, List, ListOrdered, Quote, 
  Undo, Redo, Heading1, Heading2 
} from 'lucide-react'

interface EditorToolbarProps {
  editor: TiptapEditor
}

export const EditorToolbar = ({ editor }: EditorToolbarProps) => {
  if (!editor) return null

  return (
    <div className="flex flex-wrap gap-1 border-b bg-slate-50 p-2 dark:bg-slate-800 dark:border-slate-700 sticky top-0 z-10">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        disabled={!editor.can().chain().focus().toggleBold().run()}
        className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${editor.isActive('bold') ? 'bg-slate-200 dark:bg-slate-700' : ''}`}
        title="Bold"
      >
        <Bold className="h-4 w-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        disabled={!editor.can().chain().focus().toggleItalic().run()}
        className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${editor.isActive('italic') ? 'bg-slate-200 dark:bg-slate-700' : ''}`}
        title="Italic"
      >
        <Italic className="h-4 w-4" />
      </button>
      <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1 self-center" />
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${editor.isActive('heading', { level: 1 }) ? 'bg-slate-200 dark:bg-slate-700' : ''}`}
        title="Heading 1"
      >
        <Heading1 className="h-4 w-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${editor.isActive('heading', { level: 2 }) ? 'bg-slate-200 dark:bg-slate-700' : ''}`}
        title="Heading 2"
      >
        <Heading2 className="h-4 w-4" />
      </button>
      <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1 self-center" />
      <button
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${editor.isActive('bulletList') ? 'bg-slate-200 dark:bg-slate-700' : ''}`}
        title="Bullet List"
      >
        <List className="h-4 w-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${editor.isActive('orderedList') ? 'bg-slate-200 dark:bg-slate-700' : ''}`}
        title="Ordered List"
      >
        <ListOrdered className="h-4 w-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className={`p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700 ${editor.isActive('blockquote') ? 'bg-slate-200 dark:bg-slate-700' : ''}`}
        title="Quote"
      >
        <Quote className="h-4 w-4" />
      </button>
      <div className="flex-1" />
      <button
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().chain().focus().undo().run()}
        className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
        title="Undo"
      >
        <Undo className="h-4 w-4" />
      </button>
      <button
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().chain().focus().redo().run()}
        className="p-2 rounded hover:bg-slate-200 dark:hover:bg-slate-700"
        title="Redo"
      >
        <Redo className="h-4 w-4" />
      </button>
    </div>
  )
}
