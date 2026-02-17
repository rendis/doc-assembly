import { useTranslation } from 'react-i18next'
import { Link, useParams } from '@tanstack/react-router'
import { StatCard } from './StatCard'
import { RecentActivity } from './RecentActivity'
import { QuickDraft } from './QuickDraft'
import { useDocumentStatistics } from '@/features/signing/hooks/useDocumentStatistics'

function formatSyncTime(timestamp: number): string {
  const date = new Date(timestamp)
  const now = new Date()
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()

  const time = date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })

  if (isToday) return `Today, ${time}`

  return `${date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${time}`
}

export function DashboardPage() {
  const { t } = useTranslation()
  const { workspaceId } = useParams({ strict: false })
  const { data: statistics, isLoading, dataUpdatedAt } = useDocumentStatistics()

  const totalGenerated = isLoading ? '-' : (statistics?.total ?? 0).toLocaleString()
  const completedCount = isLoading ? '-' : (statistics?.completed ?? 0).toLocaleString()
  const inProgressCount = isLoading
    ? '-'
    : ((statistics?.inProgress ?? 0) + (statistics?.pending ?? 0)).toLocaleString()

  return (
    <div className="animate-page-enter flex-1 overflow-y-auto bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-6 lg:px-6 lg:py-16">
        {/* Header */}
        <header className="mb-20 flex flex-col justify-between gap-6 md:mb-24 md:flex-row md:items-end">
          <div>
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-foreground" />
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {t('dashboard.subtitle', 'Workspace Overview')}
              </p>
            </div>
            <h1 className="font-display text-4xl font-light leading-none tracking-tighter text-foreground md:text-5xl lg:text-6xl">
              {t('dashboard.title', 'Status Monitor')}
            </h1>
          </div>
          <div className="hidden text-left md:block md:text-right">
            <p className="mb-1 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              {t('dashboard.lastSynced', 'Last Synced')}
            </p>
            <p className="font-display text-sm font-medium">
              {dataUpdatedAt ? formatSyncTime(dataUpdatedAt) : '-'}
            </p>
          </div>
        </header>

        {/* Stats */}
        <div className="mb-24 grid grid-cols-1 gap-12 border-b border-border pb-16 md:grid-cols-3 lg:gap-24">
          <StatCard
            label={t('dashboard.stats.generated', 'Total Generated')}
            value={totalGenerated}
          />
          <StatCard
            label={t('dashboard.stats.completed', 'Completed')}
            value={completedCount}
          />
          <StatCard
            label={t('dashboard.stats.inProgress', 'In Progress')}
            value={inProgressCount}
            suffix="active"
          />
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-4 lg:gap-16">
          {/* Sidebar */}
          <div className="order-2 space-y-10 lg:order-1 lg:col-span-1">
            <QuickDraft />
          </div>

          {/* Activity */}
          <div className="order-1 lg:order-2 lg:col-span-3">
            <div className="mb-8 flex items-end justify-between">
              <h2 className="font-display text-xl font-medium tracking-tight">
                {t('dashboard.activity.title', 'Recent Activity')}
              </h2>
              <Link
                to="/workspace/$workspaceId/signing"
                // eslint-disable-next-line @typescript-eslint/no-explicit-any -- TanStack Router type limitation
                params={{ workspaceId: workspaceId ?? '' } as any}
                className="border-b border-transparent pb-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
              >
                {t('dashboard.activity.viewAll', 'View Full History')}
              </Link>
            </div>
            <RecentActivity />
          </div>
        </div>
      </div>
    </div>
  )
}
