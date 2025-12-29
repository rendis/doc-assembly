import { MoreVertical, Clock, Calendar, Pen, Eye } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from '@tanstack/react-router';
import type { TemplateVersion, TemplateVersionDetail } from '../types';
import { StatusBadge } from './StatusBadge';
import { formatDate, formatDistanceToNow } from '@/lib/date-utils';
import { Button } from '@/components/ui/button';

interface VersionsListProps {
  versions: (TemplateVersion | TemplateVersionDetail)[];
  templateId: string;
  onRefresh: () => void;
}

export function VersionsList({
  versions,
  templateId,
  onRefresh: _onRefresh,
}: VersionsListProps) {
  void _onRefresh; // Will be used for version actions
  const { t } = useTranslation();
  const { workspaceId } = useParams({ strict: false }) as { workspaceId: string };

  if (versions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        {t('templates.detail.noVersions')}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {versions.map((version, index) => (
        <VersionItem
          key={version.id}
          version={version}
          isLatest={index === 0}
          templateId={templateId}
          workspaceId={workspaceId}
        />
      ))}
    </div>
  );
}

interface VersionItemProps {
  version: TemplateVersion | TemplateVersionDetail;
  isLatest: boolean;
  templateId: string;
  workspaceId: string;
}

function VersionItem({ version, isLatest, templateId, workspaceId }: VersionItemProps) {
  const { t } = useTranslation();
  const isDraft = version.status === 'DRAFT';

  return (
    <div
      className={`
        group p-3 rounded-lg border bg-card
        hover:border-primary/30 transition-colors
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {/* Version header */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">
              v{version.versionNumber}
            </span>
            <StatusBadge status={version.status} size="sm" />
            {isLatest && (
              <span className="px-1.5 py-0.5 text-[10px] bg-primary/10 text-primary rounded">
                {t('templates.detail.latestVersion')}
              </span>
            )}
          </div>

          {/* Version name */}
          <p className="text-sm text-muted-foreground truncate" title={version.name}>
            {version.name}
          </p>

          {/* Description if present */}
          {version.description && (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
              {version.description}
            </p>
          )}

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(version.createdAt)}
            </span>

            {version.status === 'PUBLISHED' && version.publishedAt && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {t('templates.versionActions.publish')}: {formatDistanceToNow(version.publishedAt)}
              </span>
            )}

            {version.scheduledPublishAt && (
              <span className="flex items-center gap-1 text-warning">
                <Clock className="w-3 h-3" />
                {t('templates.schedule.scheduledFor')}: {formatDate(version.scheduledPublishAt)}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            asChild
          >
            <Link
              to="/workspace/$workspaceId/templates/$templateId/version/$versionId/design"
              params={{ workspaceId, templateId, versionId: version.id }}
            >
              {isDraft ? <Pen className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Link>
          </Button>

          <button
            type="button"
            className="
              p-1 rounded-md opacity-0 group-hover:opacity-100
              hover:bg-muted transition-all
            "
          >
            <MoreVertical className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
