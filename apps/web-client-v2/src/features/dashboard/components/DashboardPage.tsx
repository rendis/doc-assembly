import { useTranslation } from 'react-i18next'
import { StatCard } from './StatCard'
import { RecentActivity } from './RecentActivity'
import { QuickDraft } from './QuickDraft'
import { IntegrationsStatus } from './IntegrationsStatus'

// Sample data for charts
const chartData1 = [
  { name: 'A', value: 20 },
  { name: 'B', value: 40 },
  { name: 'C', value: 35 },
  { name: 'D', value: 50 },
  { name: 'E', value: 45 },
  { name: 'F', value: 70 },
  { name: 'G', value: 65 },
]

const chartData2 = [
  { name: 'A', value: 10 },
  { name: 'B', value: 20 },
  { name: 'C', value: 15 },
  { name: 'D', value: 30 },
  { name: 'E', value: 25 },
  { name: 'F', value: 40 },
  { name: 'G', value: 35 },
]

const barData = [
  { name: '1', value: 40 },
  { name: '2', value: 60 },
  { name: '3', value: 30 },
  { name: '4', value: 80 },
  { name: '5', value: 50 },
  { name: '6', value: 90 },
  { name: '7', value: 45 },
]

export function DashboardPage() {
  const { t } = useTranslation()

  return (
    <div className="flex-1 overflow-y-auto bg-background">
      <div className="mx-auto max-w-7xl px-6 py-12 md:px-12 lg:px-20 lg:py-16">
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
              Last Synced
            </p>
            <p className="font-display text-sm font-medium">Today, 09:42 AM</p>
          </div>
        </header>

        {/* Stats */}
        <div className="mb-24 grid grid-cols-1 gap-12 border-b border-border pb-16 md:grid-cols-3 lg:gap-24">
          <StatCard
            label={t('dashboard.stats.generated', 'Total Generated')}
            value="1,248"
            data={chartData1}
            chartType="area"
          />
          <StatCard
            label={t('dashboard.stats.signed', 'Signed (30 Days)')}
            value="302"
            badge="+12.4%"
            data={chartData2}
            chartType="step"
          />
          <StatCard
            label={t('dashboard.stats.inProgress', 'In Progress')}
            value="45"
            suffix="active"
            data={barData}
            chartType="bars"
          />
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-4 lg:gap-16">
          {/* Sidebar */}
          <div className="order-2 space-y-10 lg:order-1 lg:col-span-1">
            <QuickDraft />
            <IntegrationsStatus />
          </div>

          {/* Activity */}
          <div className="order-1 lg:order-2 lg:col-span-3">
            <div className="mb-8 flex items-end justify-between">
              <h2 className="font-display text-xl font-medium tracking-tight">
                {t('dashboard.activity.title', 'Recent Activity')}
              </h2>
              <a
                href="#"
                className="border-b border-transparent pb-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
              >
                View Full History
              </a>
            </div>
            <RecentActivity />
          </div>
        </div>
      </div>
    </div>
  )
}
