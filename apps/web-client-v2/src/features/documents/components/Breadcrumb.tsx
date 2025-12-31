import { ChevronRight } from 'lucide-react'

interface BreadcrumbItem {
  label: string
  href?: string
  isActive?: boolean
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <div className="flex items-center gap-2 py-6 font-mono text-sm text-muted-foreground">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2">
          {i > 0 && <ChevronRight size={14} />}
          {item.isActive ? (
            <span className="border-b border-foreground font-medium text-foreground">
              {item.label}
            </span>
          ) : (
            <a href={item.href || '#'} className="transition-colors hover:text-foreground">
              {item.label}
            </a>
          )}
        </div>
      ))}
    </div>
  )
}
