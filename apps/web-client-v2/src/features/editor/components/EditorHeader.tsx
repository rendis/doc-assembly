import { ArrowLeft, ArrowRight, Box } from 'lucide-react'

interface EditorHeaderProps {
  templateName: string
  templateId: string
  breadcrumb: string[]
  isSaving: boolean
  lastSaved?: Date
  onBack: () => void
  onPublish: () => void
}

export function EditorHeader({
  templateName,
  templateId,
  breadcrumb,
  isSaving,
  lastSaved: _lastSaved,
  onBack,
  onPublish,
}: EditorHeaderProps) {
  return (
    <header className="fixed left-0 right-0 top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-background px-6 md:px-12">
      <div className="flex items-center gap-8">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center border-2 border-foreground text-foreground">
            <Box size={12} fill="currentColor" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight">DOC-ASSEMBLY</span>
        </div>

        <div className="hidden h-8 w-[1px] bg-border md:block" />

        {/* Breadcrumb & title */}
        <div className="hidden flex-col justify-center md:flex">
          <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {breadcrumb.map((item, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <span className="text-muted-foreground/50">/</span>}
                <span className={i === breadcrumb.length - 1 ? 'font-semibold text-foreground' : ''}>
                  {item}
                </span>
              </span>
            ))}
          </div>
          <div className="mt-0.5 flex items-baseline gap-3">
            <h1 className="text-sm font-semibold tracking-tight text-foreground">{templateName}</h1>
            <span className="font-mono text-[10px] text-muted-foreground">ID: {templateId}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {/* Auto-save status */}
        <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
          {isSaving ? (
            <>
              <span className="h-2 w-2 animate-pulse rounded-full bg-yellow-500" />
              SAVING...
            </>
          ) : (
            <>
              <span className="h-2 w-2 rounded-full bg-green-500" />
              AUTOSAVED
            </>
          )}
        </div>

        {/* Publish button */}
        <button
          onClick={onPublish}
          className="flex h-9 items-center gap-2 bg-foreground px-6 text-xs font-medium tracking-wide text-background transition-colors hover:bg-foreground/90"
        >
          <span>PUBLISH</span>
          <ArrowRight size={14} />
        </button>

        <div className="mx-2 h-4 w-[1px] bg-border" />

        {/* Back button */}
        <button
          onClick={onBack}
          className="group flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
          BACK TO TEMPLATES
        </button>
      </div>
    </header>
  )
}
