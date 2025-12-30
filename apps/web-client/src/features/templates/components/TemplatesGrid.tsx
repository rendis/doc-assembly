import { Fragment, useMemo, useState, useCallback } from 'react';
import { FileText, ChevronLeft, ChevronRight, Folder, ArrowUpRight, ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { TemplateRow, TemplateRowSkeleton } from './TemplateRow';
import { templatesApi } from '../api/templates-api';
import type { TemplateListItem, TemplateWithAllVersions, TagWithCount } from '../types';

// Types for folder grouping
interface TemplateGroup {
  folderId: string | undefined;
  folderName: string | undefined;
  templates: TemplateListItem[];
}

/**
 * Groups consecutive templates by folder.
 * Assumes templates are pre-sorted by the API (current folder first, then subfolders).
 */
function groupTemplatesByFolder(
  templates: TemplateListItem[],
  getFolderName?: (folderId: string | undefined) => string | undefined
): TemplateGroup[] {
  const groups: TemplateGroup[] = [];
  let currentGroup: TemplateGroup | null = null;

  for (const template of templates) {
    if (!currentGroup || currentGroup.folderId !== template.folderId) {
      currentGroup = {
        folderId: template.folderId,
        folderName: getFolderName?.(template.folderId),
        templates: [],
      };
      groups.push(currentGroup);
    }
    currentGroup.templates.push(template);
  }

  return groups;
}

/**
 * Divider component that separates template groups by folder
 */
function FolderDivider({
  folderName,
  onClick,
  isCollapsed,
  onToggleCollapse,
  templateCount,
}: {
  folderName: string;
  onClick: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  templateCount: number;
}) {
  return (
    <div className="col-span-full flex items-center gap-3 py-3 my-2 relative">
      <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
      <button
        type="button"
        onClick={onClick}
        className="
          flex items-center gap-2 px-3 py-1.5
          text-sm text-muted-foreground
          hover:text-foreground hover:bg-muted
          rounded-full transition-colors
        "
      >
        <Folder className="w-4 h-4" />
        <span>{folderName}</span>
        <ArrowUpRight className="w-3 h-3" />
      </button>
      <div className="flex-1 border-t border-dashed border-muted-foreground/30" />
      <div className="flex items-center gap-3 w-16 justify-end">
        <span
          className={`
            text-xs font-medium text-primary bg-primary/15
            w-6 h-6 rounded-full
            flex items-center justify-center
            transition-all duration-200
            ${isCollapsed ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}
          `}
        >
          {templateCount}
        </span>
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-1 rounded hover:bg-muted transition-colors"
          title={isCollapsed ? 'Expandir' : 'Colapsar'}
        >
          <ChevronDown
            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
              isCollapsed ? '-rotate-90' : ''
            }`}
          />
        </button>
      </div>
    </div>
  );
}

interface TemplatesGridProps {
  templates: TemplateListItem[];
  isLoading: boolean;
  allTags: TagWithCount[];
  onTemplateMenu: (template: TemplateListItem, e: React.MouseEvent) => void;
  onRefresh: () => void;
  getFolderName?: (folderId: string | undefined) => string | undefined;
  filterTagIds?: string[];
  onFolderClick?: (folderId: string) => void;
  currentFolderId?: string | null;
  onCloneTemplate?: (template: { id: string; title: string }) => void;
  onDeleteTemplate?: (template: { id: string; title: string }) => void;

  // Pagination
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

export function TemplatesGrid({
  templates,
  isLoading,
  allTags,
  onTemplateMenu,
  onRefresh,
  getFolderName,
  filterTagIds,
  onFolderClick,
  currentFolderId,
  onCloneTemplate,
  onDeleteTemplate,
  page,
  totalPages,
  totalCount,
  onPageChange,
}: TemplatesGridProps) {
  const { t } = useTranslation();

  // Accordion state - only one template expanded at a time
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);
  const [expandedTemplateData, setExpandedTemplateData] = useState<TemplateWithAllVersions | null>(null);
  const [isLoadingExpanded, setIsLoadingExpanded] = useState(false);

  // Track which folders are collapsed (by folderId)
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string>>(new Set());

  const toggleFolderCollapse = (folderId: string) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  // Handle template expand toggle
  const handleToggleExpand = useCallback(async (templateId: string) => {
    // If clicking the same template, collapse it
    if (expandedTemplateId === templateId) {
      setExpandedTemplateId(null);
      // Don't clear data here - wait for animation to complete via onCloseComplete
      return;
    }

    // Expand new template
    setExpandedTemplateId(templateId);
    setExpandedTemplateData(null);
    setIsLoadingExpanded(true);

    try {
      const fullTemplate = await templatesApi.getWithAllVersions(templateId);
      setExpandedTemplateData(fullTemplate);
    } catch (error) {
      console.error('Failed to fetch template details:', error);
      // Keep expanded but show empty state
    } finally {
      setIsLoadingExpanded(false);
    }
  }, [expandedTemplateId]);

  // Called after collapse animation completes - clean up data
  const handleCloseComplete = useCallback(() => {
    setExpandedTemplateData(null);
  }, []);

  // Refresh expanded template data
  const handleRefreshExpanded = useCallback(async () => {
    onRefresh();

    if (expandedTemplateId) {
      try {
        const updated = await templatesApi.getWithAllVersions(expandedTemplateId);
        setExpandedTemplateData(updated);
      } catch (error) {
        console.error('Failed to refresh expanded template:', error);
      }
    }
  }, [expandedTemplateId, onRefresh]);

  // Group templates by folder (API returns them sorted: current folder first, then subfolders)
  const groups = useMemo(() => {
    return groupTemplatesByFolder(templates, getFolderName);
  }, [templates, getFolderName]);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <TemplateRowSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="p-4 rounded-full bg-muted mb-4">
          <FileText className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium mb-1">
          {t('templates.noTemplates')}
        </h3>
        <p className="text-sm text-muted-foreground max-w-sm">
          {t('templates.noTemplatesDescription')}
        </p>
      </div>
    );
  }

  // Render a single template row
  const renderTemplateRow = (template: TemplateListItem) => {
    const isExpanded = expandedTemplateId === template.id;

    return (
      <TemplateRow
        key={template.id}
        template={template}
        tags={template.tags}
        allTags={allTags}
        priorityTagIds={filterTagIds}
        folderName={getFolderName?.(template.folderId)}
        isExpanded={isExpanded}
        expandedData={expandedTemplateData}
        isLoadingExpanded={isExpanded && isLoadingExpanded}
        onToggleExpand={() => handleToggleExpand(template.id)}
        onCloseComplete={handleCloseComplete}
        onMenuClick={(e) => onTemplateMenu(template, e)}
        onRefresh={handleRefreshExpanded}
        onCloneTemplate={onCloneTemplate}
        onDeleteTemplate={onDeleteTemplate}
      />
    );
  };

  return (
    <div className="space-y-4">
      {/* Grid */}
      <div className="flex flex-col gap-2">
        {groups.map((group) => {
          const isCollapsed = group.folderId ? collapsedFolders.has(group.folderId) : false;
          // Show divider for subfolders (not for templates in current folder or root)
          const showDivider = group.folderId && group.folderId !== currentFolderId;

          return (
            <Fragment key={group.folderId ?? 'root'}>
              {showDivider && (
                <FolderDivider
                  folderName={group.folderName ?? t('folders.root')}
                  onClick={() => onFolderClick?.(group.folderId!)}
                  isCollapsed={isCollapsed}
                  onToggleCollapse={() => toggleFolderCollapse(group.folderId!)}
                  templateCount={group.templates.length}
                />
              )}
              {/* Templates in this group */}
              <AnimatePresence initial={false}>
                {!isCollapsed &&
                  group.templates.map((template) => (
                    <motion.div
                      key={template.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      transition={{ duration: 0.15 }}
                    >
                      {renderTemplateRow(template)}
                    </motion.div>
                  ))}
              </AnimatePresence>
            </Fragment>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            {t('pagination.showing', {
              from: (page - 1) * 12 + 1,
              to: Math.min(page * 12, totalCount),
              total: totalCount,
            })}
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
              className="
                p-2 rounded-md border
                hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
              "
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="text-sm px-2">
              {t('pagination.page', { page, totalPages })}
            </span>

            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
              className="
                p-2 rounded-md border
                hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors
              "
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
