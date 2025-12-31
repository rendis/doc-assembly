import { Image, Split, PenTool, Table } from 'lucide-react'

const structures = [
  { label: 'Image', icon: Image },
  { label: 'Conditional', icon: Split },
  { label: 'Signature', icon: PenTool },
  { label: 'Table', icon: Table },
]

export function StructuresSidebar() {
  return (
    <div className="shrink-0 border-b border-border p-6">
      <h2 className="mb-4 font-mono text-xs uppercase tracking-widest text-muted-foreground">
        Structures
      </h2>
      <div className="grid grid-cols-2 gap-3">
        {structures.map((tool, i) => (
          <div
            key={i}
            className="group flex cursor-grab flex-col items-center justify-center rounded border border-border bg-muted/50 p-3 transition-colors hover:border-foreground active:cursor-grabbing"
            draggable
          >
            <tool.icon
              className="mb-1 text-muted-foreground group-hover:text-foreground"
              size={20}
            />
            <span className="text-[10px] font-medium text-muted-foreground group-hover:text-foreground">
              {tool.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
