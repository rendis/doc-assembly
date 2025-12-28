import { useState, useRef, useEffect } from 'react';
import { Search, X, ChevronDown, Check, SlidersHorizontal, FilterX } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TagWithCount } from '../types';
import { TagBadge } from './TagBadge';

interface FilterBarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  selectedTagIds: string[];
  onTagsChange: (tagIds: string[]) => void;
  availableTags: TagWithCount[];
  publishedFilter: boolean | undefined;
  onPublishedFilterChange: (value: boolean | undefined) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
}

export function FilterBar({
  searchValue,
  onSearchChange,
  selectedTagIds,
  onTagsChange,
  availableTags,
  publishedFilter,
  onPublishedFilterChange,
  onClearFilters,
  hasActiveFilters,
}: FilterBarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Filter indicator / Clear button */}
      <button
        type="button"
        onClick={hasActiveFilters ? onClearFilters : undefined}
        disabled={!hasActiveFilters}
        className={`
          p-2 rounded-md transition-all
          ${hasActiveFilters
            ? 'text-primary hover:bg-primary/10 cursor-pointer'
            : 'text-muted-foreground/50 cursor-default'
          }
        `}
        title={hasActiveFilters ? t('templates.clearFilters') : undefined}
      >
        {hasActiveFilters ? (
          <FilterX className="w-4 h-4" />
        ) : (
          <SlidersHorizontal className="w-4 h-4" />
        )}
      </button>

      {/* Tags filter */}
      <TagsDropdown
        tags={availableTags}
        selectedIds={selectedTagIds}
        onChange={onTagsChange}
      />

      {/* Status filter */}
      <StatusSegmentedControl
        value={publishedFilter}
        onChange={onPublishedFilterChange}
      />

      {/* Search input */}
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t('templates.searchPlaceholder')}
          className="
            w-full pl-9 pr-8 py-2 text-sm
            border rounded-md bg-background
            placeholder:text-muted-foreground
            focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
          "
        />
        {searchValue && (
          <button
            type="button"
            onClick={() => onSearchChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
          >
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        )}
      </div>
    </div>
  );
}

interface TagsDropdownProps {
  tags: TagWithCount[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

function TagsDropdown({ tags, selectedIds, onChange }: TagsDropdownProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTag = (tagId: string) => {
    if (selectedIds.includes(tagId)) {
      onChange(selectedIds.filter((id) => id !== tagId));
    } else {
      onChange([...selectedIds, tagId]);
    }
  };

  const selectedTags = tags.filter((tag) => selectedIds.includes(tag.id));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-2 text-sm
          border rounded-md transition-colors
          ${selectedIds.length > 0
            ? 'border-primary bg-primary/5 text-primary'
            : 'hover:bg-muted'
          }
        `}
      >
        {selectedIds.length > 0 ? (
          <span className="flex items-center gap-1">
            {t('templates.tags.label')}
            <span className="px-1.5 py-0.5 text-xs bg-primary text-primary-foreground rounded-full">
              {selectedIds.length}
            </span>
          </span>
        ) : (
          t('templates.filterByTags')
        )}
        <ChevronDown className="w-4 h-4" />
      </button>

      {isOpen && (
        <div className="
          absolute z-50 mt-1 w-64 p-2
          bg-popover border rounded-md shadow-lg
          animate-in fade-in-0 zoom-in-95
        ">
          {tags.length === 0 ? (
            <p className="px-2 py-4 text-sm text-muted-foreground text-center">
              {t('templates.noTags')}
            </p>
          ) : (
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {tags.map((tag) => {
                const isSelected = selectedIds.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => toggleTag(tag.id)}
                    className={`
                      flex items-center justify-between w-full px-2 py-1.5
                      text-sm rounded-md transition-colors
                      ${isSelected ? 'bg-primary/10' : 'hover:bg-muted'}
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <TagBadge tag={tag} size="sm" />
                      <span className="text-xs text-muted-foreground">
                        ({tag.templateCount})
                      </span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-primary" />}
                  </button>
                );
              })}
            </div>
          )}

          {selectedTags.length > 0 && (
            <div className="mt-2 pt-2 border-t">
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                {t('templates.clearFilters')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface StatusSegmentedControlProps {
  value: boolean | undefined;
  onChange: (value: boolean | undefined) => void;
}

function StatusSegmentedControl({ value, onChange }: StatusSegmentedControlProps) {
  const { t } = useTranslation();

  const options: { value: boolean | undefined; label: string }[] = [
    { value: undefined, label: t('templates.status.all') },
    { value: true, label: t('templates.status.published') },
    { value: false, label: t('templates.status.draft') },
  ];

  return (
    <div className="inline-flex rounded-md border bg-muted/50 p-0.5">
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          onClick={() => onChange(option.value)}
          className={`
            px-3 py-1.5 text-xs font-medium rounded-sm transition-all
            ${option.value === value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
            }
          `}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
