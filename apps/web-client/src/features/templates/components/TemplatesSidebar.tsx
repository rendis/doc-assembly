import { Tags } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { FolderTree } from './FolderTree';
import { TagBadge } from './TagBadge';
import type { FolderTree as FolderTreeType, TagWithCount } from '../types';

interface TemplatesSidebarProps {
  // Folders
  folders: FolderTreeType[];
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
  onCreateFolder?: () => void;
  onFolderMenu?: (folder: FolderTreeType, e: React.MouseEvent) => void;
  onDragMove?: (sourceFolderId: string, targetFolderId: string | null) => void;
  isFoldersLoading?: boolean;

  // Tags
  tags: TagWithCount[];
  onManageTags?: () => void;
  isTagsLoading?: boolean;
}

export function TemplatesSidebar({
  folders,
  selectedFolderId,
  onFolderSelect,
  onCreateFolder,
  onFolderMenu,
  onDragMove,
  isFoldersLoading,
  tags,
  onManageTags,
  isTagsLoading,
}: TemplatesSidebarProps) {
  const { t } = useTranslation();

  return (
    <aside className="w-64 flex-shrink-0 border-r bg-muted/30 p-4 space-y-6 overflow-y-auto h-full">
      {/* Folders Section */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          {t('folders.title')}
        </h3>
        <FolderTree
          folders={folders}
          selectedFolderId={selectedFolderId}
          onFolderSelect={onFolderSelect}
          onCreateFolder={onCreateFolder}
          onFolderMenu={onFolderMenu}
          onDragMove={onDragMove}
          isLoading={isFoldersLoading}
        />
      </div>

      {/* Tags Section */}
      <div>
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-1.5">
          <Tags className="w-3.5 h-3.5" />
          {t('templates.tags.label')}
        </h3>

        {isTagsLoading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-6 bg-muted rounded-full w-20" />
            <div className="h-6 bg-muted rounded-full w-16" />
            <div className="h-6 bg-muted rounded-full w-24" />
          </div>
        ) : tags.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            {t('tagManager.noTags')}
          </p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <div key={tag.id} className="flex items-center gap-1">
                <TagBadge tag={tag} size="sm" />
                <span className="text-[10px] text-muted-foreground">
                  {tag.templateCount}
                </span>
              </div>
            ))}
          </div>
        )}

        {onManageTags && (
          <button
            type="button"
            onClick={onManageTags}
            className="
              mt-3 text-xs text-primary hover:underline
            "
          >
            {t('tagManager.title')}
          </button>
        )}
      </div>
    </aside>
  );
}
