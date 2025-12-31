import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { PAGE_FORMATS, getPageStyle } from '../utils/page-formats'
import { EditorToolbar } from './EditorToolbar'

interface DocumentPageProps {
  content?: string
  format?: keyof typeof PAGE_FORMATS
  onUpdate?: (content: string) => void
}

export function DocumentPage({
  content = '',
  format = 'letter',
  onUpdate,
}: DocumentPageProps) {
  const pageFormat = PAGE_FORMATS[format] || PAGE_FORMATS.letter

  const editor = useEditor({
    extensions: [StarterKit],
    content: content || `
      <h1 style="text-align: center;">Mutual Non-Disclosure Agreement</h1>
      <p>This Non-Disclosure Agreement (the "Agreement") is entered into as of <span class="variable">{{Current Date}}</span>, by and between <span class="variable highlight">{{User Name}}</span> ("Disclosing Party") and the recipient ("Receiving Party").</p>
      <p>WHEREAS, the Parties wish to explore a business opportunity of mutual interest and in connection with this opportunity, the Disclosing Party may disclose certain confidential technical and business information which the Disclosing Party desires the Receiving Party to treat as confidential.</p>
      <p>NOW, THEREFORE, in consideration of the mutual premises and covenants contained in this Agreement, the Parties agree as follows:</p>
      <ol>
        <li><strong>Confidential Information.</strong> "Confidential Information" means any information disclosed by either party to the other party, either directly or indirectly, in writing, orally or by inspection of tangible objects.</li>
        <li><strong>Exceptions.</strong> Confidential Information shall not include any information which was publicly known and made generally available in the public domain prior to the time of disclosure.</li>
        <li><strong>Jurisdiction.</strong> This Agreement shall be governed by the laws of <span class="variable">{{jurisdiction}}</span>.</li>
      </ol>
    `,
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-full',
      },
    },
    onUpdate: ({ editor }) => {
      onUpdate?.(editor.getHTML())
    },
  })

  return (
    <div className="relative flex flex-1 justify-center overflow-y-auto bg-[hsl(var(--muted)/0.3)] p-8 md:p-12 lg:p-16">
      <EditorToolbar editor={editor} />

      <div
        className="relative bg-background text-foreground shadow-sm"
        style={pageFormat ? getPageStyle(pageFormat) : undefined}
      >
        <EditorContent
          editor={editor}
          className="min-h-full font-serif text-[11pt] leading-relaxed"
        />
      </div>
    </div>
  )
}
