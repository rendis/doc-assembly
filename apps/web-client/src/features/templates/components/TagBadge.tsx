import { X } from 'lucide-react';
import type { Tag } from '../types';

interface TagBadgeProps {
  tag: Tag;
  size?: 'sm' | 'md';
  onRemove?: () => void;
  onClick?: () => void;
}

export function TagBadge({ tag, size = 'sm', onRemove, onClick }: TagBadgeProps) {
  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs'
    : 'px-2.5 py-1 text-sm';

  const isClickable = !!onClick;
  const isRemovable = !!onRemove;

  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-full font-medium
        border transition-colors
        ${sizeClasses}
        ${isClickable ? 'cursor-pointer hover:opacity-80' : ''}
      `}
      style={{
        backgroundColor: `${tag.color}15`,
        borderColor: `${tag.color}40`,
        color: tag.color,
      }}
      onClick={onClick}
    >
      <span
        className="w-2 h-2 rounded-full"
        style={{ backgroundColor: tag.color }}
      />
      {tag.name}
      {isRemovable && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 hover:opacity-70 transition-opacity"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </span>
  );
}

interface TagBadgeListProps {
  tags: Tag[];
  maxVisible?: number;
  size?: 'sm' | 'md';
  onTagClick?: (tag: Tag) => void;
}

export function TagBadgeList({ tags, maxVisible = 3, size = 'sm', onTagClick }: TagBadgeListProps) {
  const visibleTags = tags.slice(0, maxVisible);
  const hiddenCount = tags.length - maxVisible;

  if (tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1">
      {visibleTags.map((tag) => (
        <TagBadge
          key={tag.id}
          tag={tag}
          size={size}
          onClick={onTagClick ? () => onTagClick(tag) : undefined}
        />
      ))}
      {hiddenCount > 0 && (
        <span className={`
          inline-flex items-center rounded-full font-medium
          bg-muted text-muted-foreground
          ${size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm'}
        `}>
          +{hiddenCount}
        </span>
      )}
    </div>
  );
}
