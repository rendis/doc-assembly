import { FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TemplateCard, TemplateCardSkeleton } from './TemplateCard';
import type { TemplateListItem, Tag } from '../types';

interface TemplatesGridProps {
  templates: TemplateListItem[];
  isLoading: boolean;
  onTemplateClick: (template: TemplateListItem) => void;
  onTemplateMenu: (template: TemplateListItem, e: React.MouseEvent) => void;
  getTemplateTags?: (templateId: string) => Tag[];
  getFolderName?: (folderId: string | undefined) => string | undefined;

  // Pagination
  page: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

export function TemplatesGrid({
  templates,
  isLoading,
  onTemplateClick,
  onTemplateMenu,
  getTemplateTags,
  getFolderName,
  page,
  totalPages,
  totalCount,
  onPageChange,
}: TemplatesGridProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <TemplateCardSkeleton key={i} />
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

  return (
    <div className="space-y-4">
      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {templates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            tags={getTemplateTags?.(template.id)}
            folderName={getFolderName?.(template.folderId)}
            onClick={() => onTemplateClick(template)}
            onMenuClick={(e) => onTemplateMenu(template, e)}
          />
        ))}
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
