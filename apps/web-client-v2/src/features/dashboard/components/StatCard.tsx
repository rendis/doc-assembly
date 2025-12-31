import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'

interface StatCardProps {
  label: string
  value: string | number
  suffix?: string
  badge?: string
  data?: { name: string; value: number }[]
  chartType?: 'area' | 'step' | 'bars'
}

export function StatCard({
  label,
  value,
  suffix,
  badge,
  data,
  chartType = 'area',
}: StatCardProps) {
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
      {data && (
        <div className="-ml-2 h-16 w-full overflow-hidden">
          {chartType === 'bars' ? (
            <div className="flex h-10 w-full items-end gap-[2px] border-b border-border pb-1">
              {data.map((d, i) => (
                <div
                  key={i}
                  style={{ height: `${d.value}%` }}
                  className={cn(
                    'w-1.5 bg-muted transition-colors duration-300',
                    'group-hover:bg-foreground'
                  )}
                />
              ))}
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data}>
                <defs>
                  <linearGradient id={`gradient-${label}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="currentColor" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="currentColor" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area
                  type={chartType === 'step' ? 'step' : 'monotone'}
                  dataKey="value"
                  stroke="currentColor"
                  fill={chartType === 'step' ? 'transparent' : `url(#gradient-${label})`}
                  strokeWidth={1.5}
                  className="text-foreground"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      )}
    </div>
  )
}
