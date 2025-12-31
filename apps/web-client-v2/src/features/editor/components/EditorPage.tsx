import { useParams, useNavigate } from '@tanstack/react-router'
import { useState, useCallback } from 'react'
import { useAppContextStore } from '@/stores/app-context-store'
import { EditorHeader } from './EditorHeader'
import { StructuresSidebar } from './StructuresSidebar'
import { VariablesSidebar } from './VariablesSidebar'
import { SignerRolesSidebar } from './SignerRolesSidebar'
import { RightSidebar } from './RightSidebar'
import { DocumentPage } from './DocumentPage'

export function EditorPage() {
  const { versionId } = useParams({ strict: false }) as { versionId: string }
  const navigate = useNavigate()
  const { currentWorkspace } = useAppContextStore()

  const [isSaving, setIsSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | undefined>()

  const handleBack = () => {
    if (currentWorkspace) {
      navigate({
        to: '/workspace/$workspaceId/templates',
        params: { workspaceId: currentWorkspace.id },
      })
    }
  }

  const handlePublish = () => {
    // Publish template
    console.log('Publishing template...')
  }

  const handleContentUpdate = useCallback((_content: string) => {
    // Auto-save logic
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      setLastSaved(new Date())
    }, 1000)
  }, [])

  const isNew = versionId === 'new'
  const templateName = isNew ? 'New Template' : 'Non-Disclosure Agreement v2'
  const templateId = isNew ? 'NEW' : 'NDA-2024-001'

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-muted text-foreground selection:bg-foreground selection:text-background">
      {/* Header */}
      <EditorHeader
        templateName={templateName}
        templateId={templateId}
        breadcrumb={['Templates', 'Legal', 'Details']}
        isSaving={isSaving}
        lastSaved={lastSaved}
        onBack={handleBack}
        onPublish={handlePublish}
      />

      {/* Main Layout */}
      <div className="mt-16 flex h-[calc(100vh-64px)] flex-1">
        {/* Left Sidebar */}
        <aside className="hidden h-full w-72 flex-col overflow-hidden border-r border-border bg-background lg:flex">
          <StructuresSidebar />
          <VariablesSidebar />
          <SignerRolesSidebar />
        </aside>

        {/* Center Canvas */}
        <DocumentPage onUpdate={handleContentUpdate} />

        {/* Right Sidebar */}
        <RightSidebar />
      </div>

      {/* Footer status */}
      <div className="pointer-events-none fixed bottom-4 left-6 font-mono text-[10px] uppercase tracking-widest text-muted-foreground/50 md:left-12">
        Editor Mode — Focused
      </div>
    </div>
  )
}
