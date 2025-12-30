import { Clock, Calendar, Pen, Eye, FileText, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from '@tanstack/react-router';
import type { TemplateVersion } from '../types';
import { StatusBadge } from './StatusBadge';
import { formatDate, formatDistanceToNow } from '@/lib/date-utils';
import { Button } from '@/components/ui/button';
import { VersionActionsMenu } from './version-actions';
import { cn } from '@/lib/utils';

interface VersionsListProps {
  versions: TemplateVersion[];
  templateId: string;
  onRefresh: () => void;
}

export function VersionsList({
  versions,
  templateId,
  onRefresh,
}: VersionsListProps) {
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
          onActionComplete={onRefresh}
        />
      ))}
    </div>
  );
}

interface VersionItemProps {
  version: TemplateVersion;
  isLatest: boolean;
  templateId: string;
  workspaceId: string;
  onActionComplete: () => void;
}

function VersionItem({ version, isLatest, templateId, workspaceId, onActionComplete }: VersionItemProps) {
  const { t, i18n } = useTranslation();
  const isDraft = version.status === 'DRAFT';

  // Show most relevant date: updatedAt if exists and different from createdAt, otherwise createdAt
  const hasBeenUpdated = version.updatedAt && version.updatedAt !== version.createdAt;
  const primaryDate = hasBeenUpdated ? version.updatedAt : version.createdAt;
  const primaryDateLabel = hasBeenUpdated ? t('templates.dates.updated') : t('templates.dates.created');
  const PrimaryDateIcon = hasBeenUpdated ? RefreshCw : Calendar;

  return (
    <div className="group flex flex-col md:flex-row md:items-center gap-3 px-4 py-3 rounded-lg border bg-card hover:border-primary/30 hover:bg-accent/5 transition-all">
      {/* LEFT: Status & Identity */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <StatusBadge status={version.status} size="sm" showDot={true} />

        {isLatest && (
          <span className="px-1.5 py-0.5 text-[10px] bg-primary/10 text-primary rounded font-semibold uppercase tracking-wide">
            {t('templates.detail.latestVersion')}
          </span>
        )}

        {/* Contract Icon */}
        <div
          className={cn(
            'p-2 rounded-md',
            isDraft && 'bg-warning/10 text-warning',
            version.status === 'PUBLISHED' && 'bg-primary/10 text-primary',
            version.status === 'ARCHIVED' && 'bg-muted text-muted-foreground'
          )}
        >
          <FileText className="w-5 h-5" />
        </div>
      </div>

      {/* CENTER: Version Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-0.5">
          <h4 className="font-semibold text-sm">v{version.versionNumber}</h4>
          <span className="text-sm text-foreground truncate" title={version.name}>
            {version.name}
          </span>
        </div>
        {version.description && (
          <p className="text-xs text-muted-foreground truncate">
            {version.description}
          </p>
        )}
      </div>

      {/* RIGHT: Metadata (hidden on mobile) */}
      <div className="hidden md:flex flex-col items-end gap-0.5 text-xs flex-shrink-0 min-w-[140px]">
        {/* Primary date: Updated or Created */}
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <PrimaryDateIcon className="w-3 h-3" />
          <span>{primaryDateLabel} {formatDistanceToNow(primaryDate, i18n.language)}</span>
        </div>

        {/* Published date - only for published versions */}
        {version.status === 'PUBLISHED' && version.publishedAt && (
          <div className="flex items-center gap-1.5 text-success">
            <Clock className="w-3 h-3" />
            <span>Published {formatDistanceToNow(version.publishedAt, i18n.language)}</span>
          </div>
        )}

        {/* Scheduled action indicator */}
        {version.scheduledPublishAt && (
          <div className="flex items-center gap-1.5 text-warning font-medium">
            <Clock className="w-3 h-3" />
            <span>
              {t('templates.schedule.scheduledFor')}: {formatDate(version.scheduledPublishAt)}
            </span>
          </div>
        )}
      </div>

      {/* FAR RIGHT: Actions */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* PRIMARY CTA - STAR OF THE SHOW */}
        <Button
          variant={isDraft ? 'default' : 'outline'}
          size="sm"
          className="gap-2 font-medium w-full md:w-auto"
          asChild
        >
          <Link
            to="/workspace/$workspaceId/templates/$templateId/version/$versionId/design"
            params={{ workspaceId, templateId, versionId: version.id }}
          >
            {isDraft ? (
              <>
                <Pen className="w-4 h-4" />
                {t('templates.primaryAction.editContract')}
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                {t('templates.primaryAction.viewContract')}
              </>
            )}
          </Link>
        </Button>

        {/* Secondary actions menu */}
        <VersionActionsMenu
          version={version}
          templateId={templateId}
          onActionComplete={onActionComplete}
        />
      </div>
    </div>
  );
}
