import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DocumentEditor } from '@/features/editor'
import { useState, useCallback } from 'react'

export const Route = createFileRoute('/workspace/$workspaceId/editor/$versionId')({
  component: EditorPage,
})

function EditorPage() {
  const { workspaceId, versionId } = Route.useParams()
  const [content, setContent] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)

  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent)
  }, [])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      // TODO: Implement save to API
      console.log('Saving content for version:', versionId)
      console.log('Content:', content)
      await new Promise(resolve => setTimeout(resolve, 500)) // Simulated delay
    } finally {
      setIsSaving(false)
    }
  }, [content, versionId])

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b bg-card">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/workspace/$workspaceId/templates" params={{ workspaceId }}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Volver
            </Link>
          </Button>
          <span className="text-sm text-muted-foreground">
            Version: {versionId}
          </span>
        </div>
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          <Save className="mr-2 h-4 w-4" />
          {isSaving ? 'Guardando...' : 'Guardar'}
        </Button>
      </header>

      {/* Editor */}
      <div className="flex-1 overflow-hidden">
        <DocumentEditor
          initialContent="<p>Comienza a escribir tu documento aqui...</p>"
          onContentChange={handleContentChange}
        />
      </div>
    </div>
  )
}
