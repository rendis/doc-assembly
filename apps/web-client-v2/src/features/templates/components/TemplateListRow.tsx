import { FileText, Edit, MoreHorizontal } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { TemplateListItem } from '@/types/api'

interface TemplateListRowProps {
  template: TemplateListItem
  onClick?: () => void
}

export function TemplateListRow({ template, onClick }: TemplateListRowProps) {
  const { t } = useTranslation()
  const Icon = template.hasPublishedVersion ? FileText : Edit
  const status = template.hasPublishedVersion ? 'PUBLISHED' : 'DRAFT'

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    })
  }

  return (
    <tr
      onClick={onClick}
      className="group cursor-pointer transition-colors hover:bg-accent"
    >
      <td className="border-b border-border py-6 pr-4 align-top">
        <div className="flex items-start gap-4">
          <Icon
            className="pt-1 text-muted-foreground transition-colors group-hover:text-foreground"
            size={24}
          />
          <div>
            <div className="mb-1 font-display text-lg font-medium text-foreground">
              {template.title}
            </div>
            <div className="flex flex-wrap gap-2">
              {template.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  />
                  {tag.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </td>
      <td className="border-b border-border py-6 pt-7 align-top">
        <div className="inline-flex items-center rounded border border-border bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
          {template.versionCount}{' '}
          {template.versionCount === 1
            ? t('templates.version', 'version')
            : t('templates.versions', 'versions')}
        </div>
      </td>
      <td className="border-b border-border py-6 pt-7 align-top">
        <span
          className={`inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider ${
            status === 'PUBLISHED' ? 'text-green-600' : 'text-amber-600'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              status === 'PUBLISHED' ? 'bg-green-500' : 'bg-amber-500'
            }`}
          />
          {status === 'PUBLISHED'
            ? t('templates.status.published', 'Published')
            : t('templates.status.draft', 'Draft')}
        </span>
      </td>
      <td className="border-b border-border py-6 pt-8 align-top font-mono text-sm text-muted-foreground">
        {formatDate(template.updatedAt)}
      </td>
      <td className="border-b border-border py-6 pt-7 text-center align-top">
        <button
          className="text-muted-foreground transition-colors hover:text-foreground"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreHorizontal size={20} />
        </button>
      </td>
    </tr>
  )
}
