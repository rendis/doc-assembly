import { ArrowUpRight, Edit3, Mail, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActivityItem {
  name: string
  sub: string
  status: string
  date: string
  icon: LucideIcon
}

interface RecentActivityProps {
  items?: ActivityItem[]
}

const defaultItems: ActivityItem[] = [
  {
    name: 'NDA_Vendor_Global_v2.pdf',
    sub: '#8493-A - Standard NDA',
    status: 'Signed',
    date: 'Oct 24',
    icon: ArrowUpRight,
  },
  {
    name: 'Service_Agreement_Q4_Draft.docx',
    sub: '#8499-C - MSA Global',
    status: 'Drafting',
    date: '2 hrs ago',
    icon: Edit3,
  },
  {
    name: 'Employee_Offer_J_Doe.pdf',
    sub: '#8501-F - HR Offer Letter',
    status: 'Action Req',
    date: 'Yesterday',
    icon: Mail,
  },
  {
    name: 'Contract_Renewal_Acme.pdf',
    sub: '#8320-X - Renewal Agmt',
    status: 'Signed',
    date: 'Oct 22',
    icon: ArrowUpRight,
  },
]

export function RecentActivity({ items = defaultItems }: RecentActivityProps) {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="grid grid-cols-12 border-b border-foreground pb-3 font-mono text-[10px] font-bold uppercase tracking-widest text-foreground">
        <div className="col-span-6 md:col-span-5">Document Name / Template</div>
        <div className="col-span-3 md:col-span-3">Status</div>
        <div className="col-span-3 text-right md:col-span-3">Modified</div>
        <div className="col-span-0 md:col-span-1" />
      </div>

      {/* Rows */}
      {items.map((item, i) => (
        <div
          key={i}
          className="group -mx-2 grid cursor-pointer grid-cols-12 items-center border-b border-border px-2 py-5 transition-colors hover:bg-accent"
        >
          <div className="col-span-6 pr-4 md:col-span-5">
            <div className="text-sm font-medium text-foreground">{item.name}</div>
            <div className="mt-1 font-mono text-[11px] text-muted-foreground">
              ID: {item.sub}
            </div>
          </div>
          <div className="col-span-3 md:col-span-3">
            <span
              className={cn(
                'inline-flex items-center rounded-none border px-2 py-1 font-mono text-[9px] font-bold uppercase tracking-wider',
                item.status === 'Action Req'
                  ? 'border-foreground bg-foreground text-background'
                  : 'border-border bg-background text-muted-foreground group-hover:border-foreground group-hover:text-foreground'
              )}
            >
              {item.status}
            </span>
          </div>
          <div className="col-span-3 text-right font-mono text-xs text-muted-foreground transition-colors group-hover:text-foreground md:col-span-3">
            {item.date}
          </div>
          <div className="col-span-0 flex justify-end opacity-0 transition-opacity group-hover:opacity-100 md:col-span-1">
            <item.icon size={16} className="text-foreground" />
          </div>
        </div>
      ))}
    </div>
  )
}
