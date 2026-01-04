import { Plus } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { useAppContextStore } from '@/stores/app-context-store'

export function QuickDraft() {
  const navigate = useNavigate()
  const { currentWorkspace } = useAppContextStore()

  const handleNewDocument = () => {
    if (currentWorkspace) {
      navigate({
        to: '/workspace/$workspaceId/templates',
        params: { workspaceId: currentWorkspace.id } as any,
      })
    }
  }

  return (
    <div>
      <h3 className="mb-3 font-display text-lg font-semibold">Quick Draft</h3>
      <p className="mb-6 text-xs font-light leading-relaxed text-muted-foreground">
        Create new templates or start a blank document directly from the dashboard.
      </p>
      <button
        onClick={handleNewDocument}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-none border border-border px-4 font-mono text-[11px] font-bold uppercase tracking-wider transition-all hover:border-foreground hover:bg-foreground hover:text-background"
      >
        <Plus size={16} />
        New Document
      </button>
    </div>
  )
}
