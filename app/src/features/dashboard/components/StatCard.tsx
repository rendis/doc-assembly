interface StatCardProps {
  label: string
  value: string | number
  suffix?: string
  badge?: string
}

export function StatCard({ label, value, suffix, badge }: StatCardProps) {
  return (
    <div className="group relative cursor-default">
      <div className="mb-6 flex items-start justify-between">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-colors group-hover:text-foreground">
          {label}
        </span>
      </div>
      <div className="mb-6 flex items-baseline gap-2">
        <span className="font-display text-6xl font-medium tracking-tighter text-foreground lg:text-7xl">
          {value}
        </span>
        {suffix && (
          <span className="self-center font-mono text-xs text-muted-foreground">
            {suffix}
          </span>
        )}
        {badge && (
          <span className="border border-border px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
            {badge}
          </span>
        )}
      </div>
    </div>
  )
}
