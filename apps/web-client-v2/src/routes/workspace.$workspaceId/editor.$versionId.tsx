import { createFileRoute, Link } from '@tanstack/react-router'
import { ArrowLeft, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DocumentEditor, PAGE_SIZES, DEFAULT_MARGINS } from '@/features/editor'
import { useInjectables } from '@/features/editor/hooks/useInjectables'
import { useState, useCallback, useRef } from 'react'
import type { PageSize, PageMargins } from '@/features/editor'

export const Route = createFileRoute('/workspace/$workspaceId/editor/$versionId')({
  component: EditorPage,
})

function EditorPage() {
  const { workspaceId, versionId } = Route.useParams()
  const [isSaving, setIsSaving] = useState(false)

  // Load variables (injectables) from the API
  const { variables } = useInjectables()

  // Estado del contenido (preservado entre cambios de page size)
  const contentRef = useRef<string>('<p>Comienza a escribir tu documento aqui...</p>')

  // Estado de configuracion de pagina
  const [pageSize, setPageSize] = useState<PageSize>(PAGE_SIZES.A4)
  const [margins, setMargins] = useState<PageMargins>(DEFAULT_MARGINS)

  // Key unica basada en la configuracion - cuando cambia, el editor se recrea
  const editorKey = `${pageSize.width}-${pageSize.height}-${margins.top}-${margins.bottom}-${margins.left}-${margins.right}`

  const handleContentChange = useCallback((newContent: string) => {
    contentRef.current = newContent
  }, [])

  const handlePageSizeChange = useCallback((size: PageSize) => {
    setPageSize(size)
  }, [])

  const handleMarginsChange = useCallback((newMargins: PageMargins) => {
    setMargins(newMargins)
  }, [])

  const handleSave = useCallback(async () => {
    setIsSaving(true)
    try {
      // TODO: Implement save to API
      console.log('Saving content for version:', versionId)
      console.log('Content:', contentRef.current)
      await new Promise(resolve => setTimeout(resolve, 500))
    } finally {
      setIsSaving(false)
    }
  }, [versionId])

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

      {/* Editor - key cambia cuando cambia la configuracion de pagina */}
      <div className="flex-1 overflow-hidden">
        <DocumentEditor
          key={editorKey}
          initialContent={contentRef.current}
          onContentChange={handleContentChange}
          pageSize={pageSize}
          margins={margins}
          onPageSizeChange={handlePageSizeChange}
          onMarginsChange={handleMarginsChange}
          variables={variables}
        />
      </div>
    </div>
  )
}
