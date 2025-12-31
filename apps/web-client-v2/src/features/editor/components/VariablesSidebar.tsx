import { Search, Edit2, Trash, Calendar, Type, DollarSign, CheckSquare, Hash } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { Variable, VariableType } from '../types'

const mockVariables: Variable[] = [
  { id: '1', name: 'current_date', label: '{{Current Date}}', type: 'date' },
  { id: '2', name: 'current_year', label: '{{Current Year}}', type: 'number' },
  { id: '3', name: 'user_name', label: '{{User Name}}', type: 'text' },
  { id: '4', name: 'company_name', label: '{{Company Name}}', type: 'text' },
  { id: '5', name: 'total_amount', label: '{{Total Amount}}', type: 'currency' },
  { id: '6', name: 'is_renewal', label: '{{Is Renewal}}', type: 'boolean' },
]

const typeConfig: Record<VariableType, { icon: typeof Calendar; colorClass: string }> = {
  date: { icon: Calendar, colorClass: 'text-purple-600 bg-purple-50 border-purple-100 dark:bg-purple-950 dark:border-purple-900' },
  number: { icon: Hash, colorClass: 'text-blue-600 bg-blue-50 border-blue-100 dark:bg-blue-950 dark:border-blue-900' },
  text: { icon: Type, colorClass: 'text-muted-foreground bg-muted border-border' },
  currency: { icon: DollarSign, colorClass: 'text-green-600 bg-green-50 border-green-100 dark:bg-green-950 dark:border-green-900' },
  boolean: { icon: CheckSquare, colorClass: 'text-orange-600 bg-orange-50 border-orange-100 dark:bg-orange-950 dark:border-orange-900' },
}

interface VariablesSidebarProps {
  onVariableSelect?: (variable: Variable) => void
}

export function VariablesSidebar({ onVariableSelect }: VariablesSidebarProps) {
  const [filter, setFilter] = useState('')

  const filteredVariables = mockVariables.filter((v) =>
    v.label.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="flex min-h-0 flex-1 flex-col border-b border-border">
      <div className="px-6 pb-4 pt-6">
        <h2 className="mb-3 font-mono text-xs uppercase tracking-widest text-muted-foreground">
          Variables
        </h2>
        <div className="relative">
          <Search className="absolute inset-y-0 left-2 top-2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="Filter variables..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full rounded border border-border bg-muted py-1.5 pl-8 pr-3 text-xs text-foreground transition-colors placeholder:text-muted-foreground focus:border-foreground focus:outline-none focus:ring-0"
          />
        </div>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto px-6 pb-4">
        {filteredVariables.map((variable) => {
          const config = typeConfig[variable.type]
          const Icon = config.icon

          return (
            <div
              key={variable.id}
              onClick={() => onVariableSelect?.(variable)}
              className="group -mx-2 flex cursor-grab items-center justify-between rounded-sm px-2 py-2 hover:bg-accent active:cursor-grabbing"
              draggable
            >
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    'flex h-5 w-5 items-center justify-center rounded border',
                    config.colorClass
                  )}
                >
                  <Icon size={12} />
                </div>
                <span className="font-mono text-sm text-muted-foreground">{variable.label}</span>
              </div>
              <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button className="p-1 text-muted-foreground hover:text-foreground">
                  <Edit2 size={14} />
                </button>
                <button className="p-1 text-muted-foreground hover:text-destructive">
                  <Trash size={14} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
