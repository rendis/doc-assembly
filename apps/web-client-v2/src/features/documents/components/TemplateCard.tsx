import { useTranslation } from 'react-i18next'
import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TemplateListItem } from '@/types/api'

interface TemplateCardProps {
  template: TemplateListItem
  onClick?: () => void
}

export function TemplateCard({ template, onClick }: TemplateCardProps) {
  const { t } = useTranslation()

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick?.()
        }
      }}
      className={cn(
        'group relative flex cursor-pointer flex-col gap-6 border border-border bg-background p-6 transition-colors hover:border-foreground'
      )}
    >
      {/* Icon */}
      <div className="flex items-start justify-between">
        <div className="flex h-10 w-10 items-center justify-center bg-muted">
          <FileText
            className="text-muted-foreground transition-colors group-hover:text-foreground"
            size={24}
            strokeWidth={1}
          />
        </div>

        {/* Status indicator */}
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              template.hasPublishedVersion
                ? 'bg-foreground'
                : 'border border-muted-foreground'
            )}
          />
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {template.hasPublishedVersion
              ? t('templates.status.published', 'Published')
              : t('templates.status.draft', 'Draft')}
          </span>
        </div>
      </div>

      {/* Content */}
      <div>
        <h3 className="mb-2 truncate font-display text-lg font-medium leading-snug text-foreground decoration-1 underline-offset-4 group-hover:underline">
          {template.title}
        </h3>

        {/* Tags */}
        {template.tags && template.tags.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {template.tags.slice(0, 3).map((tag) => (
              <span
                key={tag.id}
                className="inline-flex items-center rounded-sm bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
              >
                {tag.name}
              </span>
            ))}
            {template.tags.length > 3 && (
              <span className="inline-flex items-center px-1 font-mono text-[10px] text-muted-foreground">
                +{template.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Date */}
        <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          {formatDate(template.updatedAt ?? template.createdAt)}
        </p>
      </div>
    </div>
  )
}
