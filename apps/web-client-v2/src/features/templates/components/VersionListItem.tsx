import { useTranslation } from 'react-i18next'
import { Clock, CalendarCheck, Archive, ExternalLink } from 'lucide-react'
import type { TemplateVersionSummaryResponse } from '@/types/api'
import { VersionStatusBadge } from './VersionStatusBadge'

interface VersionListItemProps {
  version: TemplateVersionSummaryResponse
  onOpenEditor: (versionId: string) => void
}

function formatDate(dateString?: string): string | null {
  if (!dateString) return null
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function VersionListItem({ version, onOpenEditor }: VersionListItemProps) {
  const { t } = useTranslation()

  return (
    <div
      onClick={() => onOpenEditor(version.id)}
      className="group cursor-pointer border-b border-border px-4 py-4 transition-colors hover:bg-accent"
    >
      <div className="flex items-start justify-between gap-4">
        {/* Version number and name */}
        <div className="flex items-start gap-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center border border-border bg-background font-mono text-xs font-medium">
            v{version.versionNumber}
          </span>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{version.name}</span>
              <ExternalLink
                size={14}
                className="text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
              />
            </div>
            {version.description && (
              <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">
                {version.description}
              </p>
            )}
          </div>
        </div>

        {/* Status badge */}
        <VersionStatusBadge status={version.status} />
      </div>

      {/* Metadata row */}
      <div className="mt-3 flex flex-wrap gap-4 pl-11 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <Clock size={12} />
          {t('templates.versionInfo.createdAt', 'Created')}: {formatDate(version.createdAt)}
        </span>
        {version.publishedAt && (
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <CalendarCheck size={12} />
            {t('templates.versionInfo.publishedAt', 'Published')}: {formatDate(version.publishedAt)}
          </span>
        )}
        {version.archivedAt && (
          <span className="flex items-center gap-1">
            <Archive size={12} />
            {t('templates.versionInfo.archivedAt', 'Archived')}: {formatDate(version.archivedAt)}
          </span>
        )}
      </div>
    </div>
  )
}
