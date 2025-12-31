import { Edit2, Plus } from 'lucide-react'

interface Injectable {
  key: string
  value: string
}

interface GlobalInjectablesSectionProps {
  injectables: Injectable[]
  onEdit: (key: string) => void
  onAdd: () => void
}

export function GlobalInjectablesSection({
  injectables,
  onEdit,
  onAdd,
}: GlobalInjectablesSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-8 border-b border-border py-12 lg:grid-cols-12">
      <div className="pr-8 lg:col-span-4">
        <h3 className="mb-2 font-display text-xl font-medium text-foreground">
          Global Injectables
        </h3>
        <p className="font-mono text-xs uppercase leading-relaxed tracking-widest text-muted-foreground">
          Define key-value pairs available to all templates.
        </p>
      </div>
      <div className="lg:col-span-8">
        <div className="space-y-1">
          {/* Header */}
          <div className="mb-2 flex items-center border-b border-border pb-2 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <div className="w-1/3">Variable Key</div>
            <div className="w-1/2">Current Value</div>
            <div className="w-1/6 text-right">Action</div>
          </div>

          {/* Rows */}
          {injectables.map((item, i) => (
            <div
              key={i}
              className="group -mx-2 flex items-center border-b border-muted px-2 py-4 transition-colors hover:bg-accent"
            >
              <div className="w-1/3 font-mono text-sm text-foreground">{item.key}</div>
              <div className="w-1/2 truncate pr-4 font-light text-muted-foreground">
                {item.value}
              </div>
              <div className="flex w-1/6 justify-end">
                <button
                  type="button"
                  onClick={() => onEdit(item.key)}
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            </div>
          ))}

          {/* Add button */}
          <button
            type="button"
            onClick={onAdd}
            className="mt-6 flex w-fit items-center gap-2 border-b border-transparent pb-0.5 font-mono text-xs uppercase tracking-widest text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
          >
            <Plus size={16} />
            Inject new variable
          </button>
        </div>
      </div>
    </div>
  )
}
