import { FileText, MoreVertical, FolderOpen, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TemplateListItem, Tag } from '../types';
import { StatusBadge } from './StatusBadge';
import { TagBadgeList } from './TagBadge';
import { formatDistanceToNow } from '@/lib/date-utils';

interface TemplateCardProps {
  template: TemplateListItem;
  tags?: Tag[];
  folderName?: string;
  onClick?: () => void;
  onMenuClick?: (e: React.MouseEvent) => void;
}

export function TemplateCard({
  template,
  tags = [],
  folderName,
  onClick,
  onMenuClick,
}: TemplateCardProps) {
  const { t } = useTranslation();

  const status = template.hasPublishedVersion ? 'PUBLISHED' : 'DRAFT';

  return (
    <div
      className={`
        group relative rounded-lg border bg-card p-4
        transition-all duration-200
        hover:border-primary/50 hover:shadow-md
        ${onClick ? 'cursor-pointer' : ''}
      `}
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex-shrink-0 p-2 rounded-lg bg-primary/10">
            <FileText className="w-4 h-4 text-primary" />
          </div>
          <div className="min-w-0">
            <h3 className="font-medium text-sm truncate" title={template.title}>
              {template.title}
            </h3>
            {folderName && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                <FolderOpen className="w-3 h-3" />
                <span className="truncate">{folderName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Menu button */}
        {onMenuClick && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMenuClick(e);
            }}
            className="
              flex-shrink-0 p-1 rounded-md
              opacity-0 group-hover:opacity-100
              hover:bg-muted transition-all
            "
          >
            <MoreVertical className="w-4 h-4 text-muted-foreground" />
          </button>
        )}
      </div>

      {/* Status badge */}
      <div className="mb-3">
        <StatusBadge status={status} />
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div className="mb-3">
          <TagBadgeList tags={tags} maxVisible={3} />
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="w-3 h-3" />
        <span>
          {t('templates.modified')} {formatDistanceToNow(template.updatedAt || template.createdAt)}
        </span>
      </div>
    </div>
  );
}

// Skeleton for loading state
export function TemplateCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-4 animate-pulse">
      <div className="flex items-start gap-2 mb-3">
        <div className="w-8 h-8 rounded-lg bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 bg-muted rounded" />
          <div className="h-3 w-1/2 bg-muted rounded" />
        </div>
      </div>
      <div className="h-5 w-20 bg-muted rounded-full mb-3" />
      <div className="flex gap-1 mb-3">
        <div className="h-5 w-16 bg-muted rounded-full" />
        <div className="h-5 w-14 bg-muted rounded-full" />
      </div>
      <div className="h-3 w-32 bg-muted rounded" />
    </div>
  );
}
