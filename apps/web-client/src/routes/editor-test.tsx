import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { Editor } from '@/features/editor/components/Editor'

export const Route = createFileRoute('/editor-test')({
  component: EditorTestPage,
})

function EditorTestPage() {
  const [content, setContent] = useState('<h1>Hola!</h1><p>Este es el nuevo editor Tiptap.</p>')

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <h2 className="text-2xl font-bold mb-4">Prueba de Editor</h2>
      <Editor content={content} onChange={setContent} />
      
      <div className="mt-8 p-4 bg-slate-100 dark:bg-slate-800 rounded border">
        <h3 className="font-bold mb-2">HTML Result:</h3>
        <pre className="text-xs overflow-auto">{content}</pre>
      </div>
    </div>
  )
}
