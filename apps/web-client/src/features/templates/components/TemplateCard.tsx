import { useMemo } from 'react';
import { FileText, MoreVertical, FolderOpen, Clock, GripVertical } from 'lucide-react';
import type { TemplateListItem, Tag } from '../types';
import { StatusBadge } from './StatusBadge';
import { TagBadgeList } from './TagBadge';
import { formatDistanceToNow } from '@/lib/date-utils';

/**
 * Prioritizes tags: first those matching the filter, then the rest
 */
function prioritizeTags(tags: Tag[], filterTagIds?: string[]): Tag[] {
  if (!filterTagIds?.length || !tags.length) return tags;

  const filterSet = new Set(filterTagIds);
  const matching = tags.filter((t) => filterSet.has(t.id));
  const others = tags.filter((t) => !filterSet.has(t.id));

  return [...matching, ...others];
}

interface TemplateCardProps {
  template: TemplateListItem;
  tags?: Tag[];
  priorityTagIds?: string[];
  folderName?: string;
  onClick?: () => void;
  onMenuClick?: (e: React.MouseEvent) => void;
}

export function TemplateCard({
  template,
  tags = [],
  priorityTagIds,
  folderName,
  onClick,
  onMenuClick,
}: TemplateCardProps) {
  const status = template.hasPublishedVersion ? 'PUBLISHED' : 'DRAFT';

  // Prioritize tags matching the filter
  const orderedTags = useMemo(
    () => prioritizeTags(tags, priorityTagIds),
    [tags, priorityTagIds]
  );

  return (
    <div
      className={`
        group relative flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5
        transition-all duration-200
        hover:border-primary/50 hover:bg-accent/50
        ${onClick ? 'cursor-pointer' : ''}
      `}
      onClick={onClick}
    >
      {/* Drag Handle */}
      <div
        className="flex-shrink-0 cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors"
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.setData('application/template-id', template.id);
          e.dataTransfer.effectAllowed = 'move';

          // Create custom drag image
          const dragEl = document.createElement('div');
          dragEl.className = 'flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg shadow-lg text-sm font-medium';
          dragEl.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/>
              <path d="M14 2v4a2 2 0 0 0 2 2h4"/>
            </svg>
            <span style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${template.title}</span>
          `;
          dragEl.style.position = 'absolute';
          dragEl.style.top = '-1000px';
          dragEl.style.left = '-1000px';
          document.body.appendChild(dragEl);
          e.dataTransfer.setDragImage(dragEl, 20, 20);

          // Clean up after drag starts
          requestAnimationFrame(() => {
            document.body.removeChild(dragEl);
          });
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <GripVertical className="w-4 h-4" />
      </div>

      {/* Status */}
      <div className="flex-shrink-0">
        <StatusBadge status={status} size="sm" />
      </div>

      {/* Icono */}
      <div className="flex-shrink-0 p-1.5 rounded-md bg-primary/10">
        <FileText className="w-4 h-4 text-primary" />
      </div>

      {/* Título + Folder */}
      <div className="flex-1 min-w-0">
        <h3
          className="font-medium text-sm truncate"
          title={template.title}
        >
          {template.title}
        </h3>
        {folderName && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <FolderOpen className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{folderName}</span>
          </div>
        )}
      </div>

      {/* Tags */}
      {orderedTags.length > 0 && (
        <div className="flex-shrink-0 hidden md:block">
          <TagBadgeList tags={orderedTags} maxVisible={2} size="sm" />
        </div>
      )}

      {/* Fecha */}
      <div className="flex-shrink-0 hidden lg:flex items-center gap-1 text-xs text-muted-foreground">
        <Clock className="w-3 h-3" />
        <span>{formatDistanceToNow(template.updatedAt || template.createdAt)}</span>
      </div>

      {/* Menu */}
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
  );
}

// Skeleton for loading state
export function TemplateCardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-3 py-2.5 animate-pulse">
      {/* Status */}
      <div className="h-5 w-16 bg-muted rounded-full flex-shrink-0" />

      {/* Icono */}
      <div className="w-7 h-7 rounded-md bg-muted flex-shrink-0" />

      {/* Título */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="h-4 w-3/4 bg-muted rounded" />
        <div className="h-3 w-1/3 bg-muted rounded" />
      </div>

      {/* Tags */}
      <div className="hidden md:flex gap-1 flex-shrink-0">
        <div className="h-5 w-12 bg-muted rounded-full" />
        <div className="h-5 w-10 bg-muted rounded-full" />
      </div>

      {/* Fecha */}
      <div className="h-3 w-16 bg-muted rounded flex-shrink-0 hidden lg:block" />
    </div>
  );
}
