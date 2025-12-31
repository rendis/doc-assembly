import { CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WorkspaceTypeSectionProps {
  value: 'development' | 'production'
  onChange: (value: 'development' | 'production') => void
}

export function WorkspaceTypeSection({ value, onChange }: WorkspaceTypeSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-8 border-b border-border py-12 lg:grid-cols-12">
      <div className="pr-8 lg:col-span-4">
        <h3 className="mb-2 font-display text-xl font-medium text-foreground">
          Workspace Type
        </h3>
        <p className="font-mono text-xs uppercase leading-relaxed tracking-widest text-muted-foreground">
          Defines resource allocation limits and environment behavior.
        </p>
      </div>
      <div className="space-y-10 lg:col-span-8">
        <div className="group">
          <label className="mb-4 block font-mono text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Environment Mode
          </label>
          <div className="flex flex-col gap-4 sm:flex-row">
            <label className="group/item relative flex-1 cursor-pointer">
              <input
                type="radio"
                name="workspace_type"
                value="development"
                checked={value === 'development'}
                onChange={() => onChange('development')}
                className="peer sr-only"
              />
              <div
                className={cn(
                  'h-full border p-5 transition-all',
                  value === 'development'
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border hover:border-muted-foreground'
                )}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-display text-lg font-bold">Development</span>
                  {value === 'development' && <CheckCircle size={18} />}
                </div>
                <p className="font-mono text-xs uppercase tracking-widest opacity-60">
                  Sandbox & Testing
                </p>
              </div>
            </label>
            <label className="group/item relative flex-1 cursor-pointer">
              <input
                type="radio"
                name="workspace_type"
                value="production"
                checked={value === 'production'}
                onChange={() => onChange('production')}
                className="peer sr-only"
              />
              <div
                className={cn(
                  'h-full border p-5 transition-all',
                  value === 'production'
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border hover:border-muted-foreground'
                )}
              >
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-display text-lg font-bold">Production</span>
                  {value === 'production' && <CheckCircle size={18} />}
                </div>
                <p className="font-mono text-xs uppercase tracking-widest opacity-60">
                  Live Deployment
                </p>
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
