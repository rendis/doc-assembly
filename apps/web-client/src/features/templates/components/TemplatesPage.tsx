import { useState, useCallback, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { TemplatesSidebar } from './TemplatesSidebar';
import { TemplatesGrid } from './TemplatesGrid';
import { FilterBar } from './FilterBar';
import { Breadcrumb } from './Breadcrumb';
import { TemplateDetailPanel } from './TemplateDetailPanel';
import { CreateTemplateDialog } from './CreateTemplateDialog';
import { CreateFolderDialog } from './CreateFolderDialog';
import { ManageTagsDialog } from './ManageTagsDialog';
import { ContextMenu } from './ContextMenu';
import { ConfirmMoveDialog } from './ConfirmMoveDialog';
import { MoveFolderDialog } from './MoveFolderDialog';
import { RenameFolderDialog } from './RenameFolderDialog';
import { RenameTemplateDialog } from './RenameTemplateDialog';
import { useTemplates } from '../hooks/useTemplates';
import { useFolders } from '../hooks/useFolders';
import { useTags } from '../hooks/useTags';
import { useDebounce } from '@/hooks/use-debounce';
import type { TemplateListItem, FolderTree, Folder, TemplateWithAllVersions } from '../types';
import { templatesApi } from '../api/templates-api';

export function TemplatesPage() {
  const { t } = useTranslation();

  // Hooks
  const {
    templates,
    totalCount,
    tags: templatesTags,
    isLoading: isTemplatesLoading,
    filters,
    setSearch,
    setFolderId,
    setTagIds,
    setHasPublishedVersion,
    clearFilters,
    hasActiveFilters,
    page,
    totalPages,
    setPage,
    refresh: refreshTemplates,
  } = useTemplates();

  const {
    folders,
    flatFolders,
    isLoading: isFoldersLoading,
    getFolderPath,
    getFolderById,
    moveFolder,
    updateFolder,
    refresh: refreshFolders,
  } = useFolders();

  const {
    tags,
    isLoading: isTagsLoading,
    refresh: refreshTags,
  } = useTags();

  // Local state
  const [searchInput, setSearchInput] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateWithAllVersions | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] = useState(false);
  const [createFolderParentId, setCreateFolderParentId] = useState<string | undefined>();
  const [isManageTagsDialogOpen, setIsManageTagsDialogOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    type: 'template' | 'folder';
    item: TemplateListItem | FolderTree;
    x: number;
    y: number;
  } | null>(null);

  // Move folder dialogs state
  const [confirmMoveDialog, setConfirmMoveDialog] = useState<{
    isOpen: boolean;
    sourceFolder: Folder | null;
    targetFolder: Folder | null;
  }>({ isOpen: false, sourceFolder: null, targetFolder: null });

  const [moveFolderDialog, setMoveFolderDialog] = useState<{
    isOpen: boolean;
    folder: Folder | null;
  }>({ isOpen: false, folder: null });

  const [renameFolderDialog, setRenameFolderDialog] = useState<{
    isOpen: boolean;
    folder: Folder | null;
  }>({ isOpen: false, folder: null });

  const [renameTemplateDialog, setRenameTemplateDialog] = useState<{
    isOpen: boolean;
    template: { id: string; title: string } | null;
  }>({ isOpen: false, template: null });

  // Debounced search
  const debouncedSearch = useDebounce(searchInput, 300);

  // Sync debounced search with filters
  useEffect(() => {
    setSearch(debouncedSearch);
  }, [debouncedSearch, setSearch]);

  // Handlers
  const handleSearchChange = (value: string) => {
    setSearchInput(value);
  };

  const handleFolderSelect = (folderId: string | null) => {
    setFolderId(folderId);
  };

  const handleTemplateClick = async (template: TemplateListItem) => {
    try {
      const fullTemplate = await templatesApi.getWithAllVersions(template.id);
      setSelectedTemplate(fullTemplate);
      setIsDetailOpen(true);
    } catch (error) {
      console.error('Failed to fetch template details:', error);
    }
  };

  const handleTemplateMenu = (template: TemplateListItem, e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      type: 'template',
      item: template,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleFolderMenu = (folder: FolderTree, e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      type: 'folder',
      item: folder,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleCreateFolder = (parentId?: string) => {
    setCreateFolderParentId(parentId);
    setIsCreateFolderDialogOpen(true);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setSelectedTemplate(null);
  };

  // Drag & drop move handler
  const handleDragMove = useCallback((sourceFolderId: string, targetFolderId: string | null) => {
    const sourceFolder = getFolderById(sourceFolderId);
    const targetFolder = targetFolderId ? getFolderById(targetFolderId) : null;

    if (!sourceFolder) return;

    // Don't move if already in this parent
    if (sourceFolder.parentId === targetFolderId) return;

    setConfirmMoveDialog({
      isOpen: true,
      sourceFolder,
      targetFolder: targetFolder ?? null,
    });
  }, [getFolderById]);

  // Context menu move handler - opens folder selection dialog
  const handleContextMenuMoveFolder = useCallback((folder: FolderTree) => {
    const folderData = getFolderById(folder.id);
    if (!folderData) return;

    setMoveFolderDialog({
      isOpen: true,
      folder: folderData,
    });
  }, [getFolderById]);

  // Confirm move from drag & drop
  const handleConfirmDragMove = useCallback(async () => {
    if (!confirmMoveDialog.sourceFolder) return;

    await moveFolder(
      confirmMoveDialog.sourceFolder.id,
      confirmMoveDialog.targetFolder?.id
    );

    setConfirmMoveDialog({ isOpen: false, sourceFolder: null, targetFolder: null });
  }, [confirmMoveDialog, moveFolder]);

  // Confirm move from dialog selection
  const handleConfirmDialogMove = useCallback(async (folderId: string, newParentId: string | undefined) => {
    await moveFolder(folderId, newParentId);
    setMoveFolderDialog({ isOpen: false, folder: null });
  }, [moveFolder]);

  // Rename folder handlers
  const handleContextMenuRenameFolder = useCallback((folder: FolderTree) => {
    const folderData = getFolderById(folder.id);
    if (!folderData) return;

    setRenameFolderDialog({
      isOpen: true,
      folder: folderData,
    });
  }, [getFolderById]);

  const handleConfirmRenameFolder = useCallback(async (folderId: string, newName: string) => {
    await updateFolder(folderId, newName);
    setRenameFolderDialog({ isOpen: false, folder: null });
  }, [updateFolder]);

  const handleRefreshAll = useCallback(async () => {
    await Promise.all([refreshTemplates(), refreshFolders(), refreshTags()]);
    // Also refresh the selected template if one is open
    if (selectedTemplate) {
      try {
        const updated = await templatesApi.getWithAllVersions(selectedTemplate.id);
        setSelectedTemplate(updated);
      } catch (error) {
        console.error('Failed to refresh selected template:', error);
      }
    }
  }, [refreshTemplates, refreshFolders, refreshTags, selectedTemplate]);

  // Rename template handlers
  const handleRenameTemplate = useCallback((template: { id: string; title: string }) => {
    setRenameTemplateDialog({
      isOpen: true,
      template,
    });
  }, []);

  const handleConfirmRenameTemplate = useCallback(async (templateId: string, newTitle: string) => {
    await templatesApi.update(templateId, { title: newTitle });
    setRenameTemplateDialog({ isOpen: false, template: null });
    await handleRefreshAll();
  }, [handleRefreshAll]);

  const getFolderName = (folderId: string | undefined): string | undefined => {
    if (!folderId) return undefined;
    return getFolderById(folderId)?.name;
  };

  // Current folder path for breadcrumb
  const currentPath = filters.folderId ? getFolderPath(filters.folderId) : [];

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <TemplatesSidebar
        folders={folders}
        selectedFolderId={filters.folderId ?? null}
        onFolderSelect={handleFolderSelect}
        onCreateFolder={() => handleCreateFolder()}
        onFolderMenu={handleFolderMenu}
        onDragMove={handleDragMove}
        isFoldersLoading={isFoldersLoading}
        tags={templatesTags}
        onManageTags={() => setIsManageTagsDialogOpen(true)}
        isTagsLoading={isTagsLoading}
      />

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="flex-shrink-0 px-6 py-4 border-b bg-background">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold">{t('templates.title')}</h1>
              <p className="text-sm text-muted-foreground">{t('templates.subtitle')}</p>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateDialogOpen(true)}
              className="
                flex items-center gap-2 px-4 py-2
                bg-primary text-primary-foreground
                rounded-md font-medium text-sm
                hover:bg-primary/90 transition-colors
              "
            >
              <Plus className="w-4 h-4" />
              {t('templates.new')}
            </button>
          </div>

          {/* Breadcrumb */}
          <Breadcrumb path={currentPath} onNavigate={handleFolderSelect} />
        </header>

        {/* Filter bar */}
        <div className="flex-shrink-0 px-6 py-3 border-b">
          <FilterBar
            searchValue={searchInput}
            onSearchChange={handleSearchChange}
            selectedTagIds={filters.tagIds ?? []}
            onTagsChange={setTagIds}
            availableTags={tags}
            publishedFilter={filters.hasPublishedVersion}
            onPublishedFilterChange={setHasPublishedVersion}
            onClearFilters={clearFilters}
            hasActiveFilters={hasActiveFilters}
          />
        </div>

        {/* Templates grid */}
        <div className="flex-1 overflow-y-auto p-6">
          <TemplatesGrid
            templates={templates}
            isLoading={isTemplatesLoading}
            onTemplateClick={handleTemplateClick}
            onTemplateMenu={handleTemplateMenu}
            getFolderName={getFolderName}
            filterTagIds={filters.tagIds}
            isRootView={!filters.folderId}
            onFolderClick={handleFolderSelect}
            page={page}
            totalPages={totalPages}
            totalCount={totalCount}
            onPageChange={setPage}
          />
        </div>
      </main>

      {/* Detail panel */}
      <TemplateDetailPanel
        template={selectedTemplate}
        isOpen={isDetailOpen}
        onClose={handleCloseDetail}
        onRefresh={handleRefreshAll}
        tags={tags}
        onRenameTemplate={handleRenameTemplate}
      />

      {/* Dialogs */}
      <CreateTemplateDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        folders={flatFolders}
        tags={tags}
        currentFolderId={filters.folderId}
        onCreated={handleRefreshAll}
      />

      <CreateFolderDialog
        isOpen={isCreateFolderDialogOpen}
        onClose={() => setIsCreateFolderDialogOpen(false)}
        folders={flatFolders}
        parentId={createFolderParentId}
        onCreated={refreshFolders}
      />

      <ManageTagsDialog
        isOpen={isManageTagsDialogOpen}
        onClose={() => setIsManageTagsDialogOpen(false)}
        onChanged={refreshTags}
      />

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          type={contextMenu.type}
          item={contextMenu.item}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onRefresh={handleRefreshAll}
          onMoveFolder={handleContextMenuMoveFolder}
          onCreateSubfolder={handleCreateFolder}
          onRenameFolder={handleContextMenuRenameFolder}
          onRenameTemplate={handleRenameTemplate}
        />
      )}

      {/* Move folder dialogs */}
      <ConfirmMoveDialog
        isOpen={confirmMoveDialog.isOpen}
        sourceName={confirmMoveDialog.sourceFolder?.name ?? ''}
        targetName={confirmMoveDialog.targetFolder?.name ?? t('folders.root')}
        onConfirm={handleConfirmDragMove}
        onCancel={() => setConfirmMoveDialog({ isOpen: false, sourceFolder: null, targetFolder: null })}
      />

      <MoveFolderDialog
        isOpen={moveFolderDialog.isOpen}
        folder={moveFolderDialog.folder}
        folders={folders}
        flatFolders={flatFolders}
        onConfirm={handleConfirmDialogMove}
        onCancel={() => setMoveFolderDialog({ isOpen: false, folder: null })}
      />

      <RenameFolderDialog
        isOpen={renameFolderDialog.isOpen}
        folder={renameFolderDialog.folder}
        onConfirm={handleConfirmRenameFolder}
        onCancel={() => setRenameFolderDialog({ isOpen: false, folder: null })}
      />

      <RenameTemplateDialog
        isOpen={renameTemplateDialog.isOpen}
        template={renameTemplateDialog.template}
        onConfirm={handleConfirmRenameTemplate}
        onCancel={() => setRenameTemplateDialog({ isOpen: false, template: null })}
      />
    </div>
  );
}
