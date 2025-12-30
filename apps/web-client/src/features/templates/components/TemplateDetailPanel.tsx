import { useState } from 'react';
import { X, FileText, FolderOpen, Calendar, Clock, Plus, Pencil, Copy, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TemplateWithAllVersions, TagWithCount } from '../types';
import { StatusBadge } from './StatusBadge';
import { TagBadge } from './TagBadge';
import { VersionsList } from './VersionsList';
import { EditTemplateTagsDialog } from './EditTemplateTagsDialog';
import { formatDate, formatDistanceToNow } from '@/lib/date-utils';

interface TemplateDetailPanelProps {
  template: TemplateWithAllVersions | null;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
  tags: TagWithCount[];
  onRenameTemplate?: (template: { id: string; title: string }) => void;
}

export function TemplateDetailPanel({
  template,
  isOpen,
  onClose,
  onRefresh,
  tags,
  onRenameTemplate,
}: TemplateDetailPanelProps) {
  const { t } = useTranslation();
  const [isEditTagsOpen, setIsEditTagsOpen] = useState(false);

  if (!isOpen || !template) return null;

  const versions = template.versions ?? [];
  const publishedVersion = versions.find((v) => v.status === 'PUBLISHED');
  const latestVersion = versions[0];

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40"
        onClick={onClose}
      />

      {/* Panel */}
      <aside
        className="
          fixed right-0 top-0 bottom-0 w-96 z-50
          bg-background border-l shadow-xl
          flex flex-col
          animate-in slide-in-from-right duration-300
        "
      >
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-semibold truncate">{t('templates.detail.title')}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Template info */}
          <section className="p-4 border-b">
            <div className="flex items-start gap-3 mb-4">
              <div className="p-2.5 rounded-lg bg-primary/10">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-lg truncate" title={template.title}>
                    {template.title}
                  </h3>
                  <button
                    type="button"
                    onClick={() => onRenameTemplate?.(template)}
                    className="p-1 rounded hover:bg-muted transition-colors flex-shrink-0"
                    title={t('templates.actions.edit')}
                  >
                    <Pencil className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
                {template.folder && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>{template.folder.name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Status */}
            <div className="flex items-center gap-2 mb-4">
              {publishedVersion ? (
                <StatusBadge status="PUBLISHED" size="md" />
              ) : (
                <StatusBadge status="DRAFT" size="md" />
              )}
              {latestVersion && (
                <span className="text-sm text-muted-foreground">
                  v{latestVersion.versionNumber}
                </span>
              )}
            </div>

            {/* Tags */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-xs text-muted-foreground">{t('templates.tags.label')}</p>
                <button
                  type="button"
                  onClick={() => setIsEditTagsOpen(true)}
                  className="p-1 rounded hover:bg-muted transition-colors"
                  title={t('templates.tags.edit')}
                >
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
              {template.tags && template.tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {template.tags.map((tag) => (
                    <TagBadge key={tag.id} tag={tag} size="sm" />
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  {t('templates.tags.noTagsAssigned')}
                </p>
              )}
            </div>

            {/* Metadata */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-3.5 h-3.5" />
                <span>{t('templates.created')}: {formatDate(template.createdAt)}</span>
              </div>
              {template.updatedAt && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{t('templates.modified')}: {formatDistanceToNow(template.updatedAt)}</span>
                </div>
              )}
            </div>
          </section>

          {/* Versions */}
          <section className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">{t('templates.detail.versionsTitle')}</h4>
              <button
                type="button"
                className="
                  flex items-center gap-1.5 px-2.5 py-1.5
                  text-xs font-medium text-primary
                  border border-primary/20 rounded-md
                  hover:bg-primary/5 transition-colors
                "
              >
                <Plus className="w-3.5 h-3.5" />
                {t('templates.detail.createVersion')}
              </button>
            </div>

            <VersionsList
              versions={versions}
              templateId={template.id}
              onRefresh={onRefresh}
            />
          </section>
        </div>

        {/* Footer actions */}
        <footer className="flex-shrink-0 px-4 py-3 border-t bg-muted/30">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="
                flex-1 flex items-center justify-center gap-2
                px-3 py-2 text-sm font-medium
                border rounded-md
                hover:bg-muted transition-colors
              "
            >
              <Copy className="w-4 h-4" />
              {t('templates.actions.clone')}
            </button>
            <button
              type="button"
              className="
                flex-1 flex items-center justify-center gap-2
                px-3 py-2 text-sm font-medium
                text-destructive border border-destructive/30 rounded-md
                hover:bg-destructive/10 transition-colors
              "
            >
              <Trash2 className="w-4 h-4" />
              {t('templates.actions.delete')}
            </button>
          </div>
        </footer>
      </aside>

      {/* Edit Tags Dialog */}
      <EditTemplateTagsDialog
        isOpen={isEditTagsOpen}
        onClose={() => setIsEditTagsOpen(false)}
        templateId={template.id}
        currentTags={template.tags ?? []}
        availableTags={tags}
        onSaved={onRefresh}
      />
    </>
  );
}
