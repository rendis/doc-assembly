import { Settings, History, MessageSquare } from 'lucide-react'

export function RightSidebar() {
  return (
    <div className="z-20 hidden w-16 flex-col items-center gap-6 border-l border-border bg-background py-6 md:flex">
      <button
        className="group relative flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        title="Settings"
      >
        <Settings size={20} />
      </button>
      <button
        className="group relative flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        title="History"
      >
        <History size={20} />
      </button>
      <button
        className="group relative flex h-10 w-10 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        title="Comments"
      >
        <MessageSquare size={20} />
      </button>
    </div>
  )
}
