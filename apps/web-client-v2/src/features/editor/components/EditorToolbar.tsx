import { Bold, Italic, Code, PenTool } from 'lucide-react'
import type { Editor } from '@tiptap/react'
import { cn } from '@/lib/utils'

interface EditorToolbarProps {
  editor: Editor | null
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null

  return (
    <div className="absolute left-1/2 top-6 z-40 flex -translate-x-1/2 items-center gap-1 rounded-full border border-border bg-background px-4 py-2 shadow-lg">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
          editor.isActive('bold')
            ? 'bg-accent text-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        )}
        title="Bold"
      >
        <Bold size={18} />
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full transition-colors',
          editor.isActive('italic')
            ? 'bg-accent text-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-foreground'
        )}
        title="Italic"
      >
        <Italic size={18} />
      </button>

      <div className="mx-1 h-4 w-[1px] bg-border" />

      <button
        className="flex h-8 items-center gap-2 rounded-full px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        title="Insert Variable"
      >
        <Code size={18} />
        <span>Insert Variable</span>
      </button>

      <div className="mx-1 h-4 w-[1px] bg-border" />

      <button
        className="flex h-8 items-center gap-2 rounded-full px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        title="Signer Field"
      >
        <PenTool size={18} />
        <span>Signer Field</span>
      </button>
    </div>
  )
}
