import { TriangleAlert, ArrowRight } from 'lucide-react'

interface UnsavedChangesAlertProps {
  hasChanges: boolean
  onReset: () => void
  onApply: () => void
}

export function UnsavedChangesAlert({ hasChanges, onReset, onApply }: UnsavedChangesAlertProps) {
  return (
    <div className="flex flex-col items-center justify-between gap-6 py-12 sm:flex-row">
      {hasChanges ? (
        <div className="flex items-center gap-2 border border-yellow-200 bg-yellow-50 px-3 py-2 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-400">
          <TriangleAlert size={18} />
          <span className="font-mono text-xs uppercase tracking-widest">Unsaved Changes</span>
        </div>
      ) : (
        <div />
      )}
      <div className="flex w-full items-center gap-6 sm:w-auto">
        <button
          type="button"
          onClick={onReset}
          className="flex-1 font-mono text-sm uppercase tracking-widest text-muted-foreground transition-colors hover:text-foreground sm:flex-none"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onApply}
          className="group flex h-12 flex-1 items-center justify-center gap-3 rounded-none bg-foreground px-8 font-mono text-xs font-medium uppercase tracking-widest text-background shadow-lg shadow-muted transition-colors hover:bg-foreground/90 sm:flex-none"
        >
          <span>Apply Config</span>
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
        </button>
      </div>
    </div>
  )
}
