import { useState } from 'react';
import { FolderOpen, Calendar, Clock, Pencil, Copy, Trash2, Plus, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TemplateWithAllVersions, TagWithCount } from '../types';
import { TagBadge } from './TagBadge';
import { VersionsList } from './VersionsList';
import { EditTemplateTagsDialog } from './EditTemplateTagsDialog';
import { CreateVersionDialog } from './CreateVersionDialog';
import { formatDate, formatDistanceToNow } from '@/lib/date-utils';
import { Button } from '@/components/ui/button';
import { PermissionGuard } from '@/components/common/PermissionGuard';
import { Permission } from '@/features/auth/rbac/rules';

interface TemplateExpandedContentProps {
  template: TemplateWithAllVersions | null;
  tags: TagWithCount[];
  isLoading?: boolean;
  onRefresh: () => void;
  // onRenameTemplate is reserved for future use when we add inline renaming in expanded view
  onCloneTemplate?: (template: { id: string; title: string }) => void;
  onDeleteTemplate?: (template: { id: string; title: string }) => void;
}

export function TemplateExpandedContent({
  template,
  tags,
  isLoading = false,
  onRefresh,
  onCloneTemplate,
  onDeleteTemplate,
}: TemplateExpandedContentProps) {
  const { t } = useTranslation();
  const [isEditTagsOpen, setIsEditTagsOpen] = useState(false);
  const [isCreateVersionOpen, setIsCreateVersionOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!template) return null;

  const versions = template.versions ?? [];

  return (
    <>
      <div className="p-4 bg-muted/30 border-t space-y-4">
        {/* Template Info - Compact horizontal layout */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {/* Folder */}
          {template.folder && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <FolderOpen className="w-3.5 h-3.5" />
              <span>{template.folder.name}</span>
            </div>
          )}

          {/* Tags */}
          <div className="flex items-center gap-1.5">
            {template.tags && template.tags.length > 0 ? (
              <>
                {template.tags.map((tag) => (
                  <TagBadge key={tag.id} tag={tag} size="sm" />
                ))}
              </>
            ) : (
              <span className="text-xs text-muted-foreground italic">
                {t('templates.tags.noTagsAssigned')}
              </span>
            )}
            <PermissionGuard permission={Permission.CONTENT_EDIT}>
              <button
                type="button"
                onClick={() => setIsEditTagsOpen(true)}
                className="p-0.5 rounded hover:bg-muted transition-colors"
                title={t('templates.tags.edit')}
              >
                <Pencil className="w-3 h-3 text-muted-foreground" />
              </button>
            </PermissionGuard>
          </div>

          {/* Dates */}
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDate(template.createdAt)}</span>
          </div>
          {template.updatedAt && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Clock className="w-3.5 h-3.5" />
              <span>{formatDistanceToNow(template.updatedAt)}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 ml-auto">
            <PermissionGuard permission={Permission.CONTENT_CREATE}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onCloneTemplate?.(template)}
                className="gap-1.5 h-7 text-xs"
              >
                <Copy className="w-3.5 h-3.5" />
                {t('templates.actions.clone')}
              </Button>
            </PermissionGuard>
            <PermissionGuard permission={Permission.CONTENT_DELETE}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDeleteTemplate?.(template)}
                className="gap-1.5 h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
                {t('templates.actions.delete')}
              </Button>
            </PermissionGuard>
          </div>
        </div>

        {/* Versions Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {t('templates.detail.versionsTitle')}
            </h4>
            <PermissionGuard permission={Permission.CONTENT_CREATE}>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 h-7 text-xs"
                onClick={() => setIsCreateVersionOpen(true)}
              >
                <Plus className="w-3 h-3" />
                {t('templates.detail.createVersion')}
              </Button>
            </PermissionGuard>
          </div>

          <div className="max-h-72 overflow-y-auto">
            <VersionsList
              versions={versions}
              templateId={template.id}
              onRefresh={onRefresh}
            />
          </div>
        </div>
      </div>

      {/* Edit Tags Dialog */}
      <EditTemplateTagsDialog
        isOpen={isEditTagsOpen}
        onClose={() => setIsEditTagsOpen(false)}
        templateId={template.id}
        currentTags={template.tags ?? []}
        availableTags={tags}
        onSaved={onRefresh}
      />

      {/* Create Version Dialog */}
      <CreateVersionDialog
        isOpen={isCreateVersionOpen}
        onClose={() => setIsCreateVersionOpen(false)}
        templateId={template.id}
        onCreated={onRefresh}
      />
    </>
  );
}

// Skeleton for loading state
export function TemplateExpandedContentSkeleton() {
  return (
    <div className="p-4 bg-muted/30 border-t space-y-4 animate-pulse">
      {/* Info row */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="h-4 w-24 bg-muted rounded" />
        <div className="flex gap-1.5">
          <div className="h-5 w-14 bg-muted rounded-full" />
          <div className="h-5 w-12 bg-muted rounded-full" />
        </div>
        <div className="h-4 w-20 bg-muted rounded" />
        <div className="h-4 w-16 bg-muted rounded" />
        <div className="flex gap-2 ml-auto">
          <div className="h-7 w-16 bg-muted rounded" />
          <div className="h-7 w-16 bg-muted rounded" />
        </div>
      </div>

      {/* Versions section */}
      <div className="space-y-3">
        <div className="flex justify-between">
          <div className="h-3 w-20 bg-muted rounded" />
          <div className="h-7 w-28 bg-muted rounded" />
        </div>
        <div className="space-y-2">
          <div className="h-20 bg-muted rounded-lg" />
          <div className="h-20 bg-muted rounded-lg" />
        </div>
      </div>
    </div>
  );
}
