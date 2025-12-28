import { useState, useCallback } from 'react';
import { ChevronRight, ChevronDown, Folder, FolderOpen, Plus, MoreVertical, Home } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { FolderTree as FolderTreeType } from '../types';

interface FolderTreeProps {
  folders: FolderTreeType[];
  selectedFolderId?: string | null;
  onFolderSelect: (folderId: string | null) => void;
  onCreateFolder?: (parentId?: string) => void;
  onFolderMenu?: (folder: FolderTreeType, e: React.MouseEvent) => void;
  onDragMove?: (sourceFolderId: string, targetFolderId: string | null) => void;
  isLoading?: boolean;
}

// Helper to get all descendant IDs of a folder
function getDescendantIds(folderId: string, folders: FolderTreeType[]): Set<string> {
  const descendants = new Set<string>();

  const traverse = (nodes: FolderTreeType[]) => {
    for (const node of nodes) {
      if (node.parentId === folderId || descendants.has(node.parentId ?? '')) {
        descendants.add(node.id);
      }
      if (node.children) {
        traverse(node.children);
      }
    }
  };

  // Multiple passes to catch nested descendants
  for (let i = 0; i < 10; i++) {
    traverse(folders);
  }

  return descendants;
}

export function FolderTree({
  folders,
  selectedFolderId,
  onFolderSelect,
  onCreateFolder,
  onFolderMenu,
  onDragMove,
  isLoading,
}: FolderTreeProps) {
  const { t } = useTranslation();
  const [dragOverId, setDragOverId] = useState<string | null | undefined>(undefined);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Get descendants of the dragging folder to prevent invalid drops
  const draggingDescendants = draggingId ? getDescendantIds(draggingId, folders) : new Set<string>();

  const handleDragStart = useCallback((e: React.DragEvent, folderId: string) => {
    e.dataTransfer.setData('text/plain', folderId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingId(folderId);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setDragOverId(undefined);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetId: string | null) => {
    e.preventDefault();
    e.stopPropagation();

    // Validate: can't drop on self or descendants
    if (draggingId === targetId || (targetId && draggingDescendants.has(targetId))) {
      e.dataTransfer.dropEffect = 'none';
      return;
    }

    e.dataTransfer.dropEffect = 'move';
    setDragOverId(targetId);
  }, [draggingId, draggingDescendants]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    // Only reset if we're leaving the tree entirely
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget?.closest('[data-folder-tree]')) {
      setDragOverId(undefined);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetId: string | null) => {
    e.preventDefault();
    e.stopPropagation();

    const sourceFolderId = e.dataTransfer.getData('text/plain');

    // Validate
    if (!sourceFolderId || sourceFolderId === targetId) {
      setDragOverId(undefined);
      return;
    }

    // Check if target is a descendant of source
    if (targetId && draggingDescendants.has(targetId)) {
      setDragOverId(undefined);
      return;
    }

    setDragOverId(undefined);
    setDraggingId(null);

    // Call the move handler
    onDragMove?.(sourceFolderId, targetId);
  }, [onDragMove, draggingDescendants]);

  if (isLoading) {
    return (
      <div className="space-y-2 animate-pulse">
        <div className="h-8 bg-muted rounded" />
        <div className="h-8 bg-muted rounded ml-4" />
        <div className="h-8 bg-muted rounded ml-4" />
        <div className="h-8 bg-muted rounded" />
      </div>
    );
  }

  return (
    <div className="space-y-1" data-folder-tree>
      {/* Root folder - drop target only */}
      <FolderItem
        name={t('folders.root')}
        isRoot
        isSelected={selectedFolderId === null}
        isDragOver={dragOverId === null && draggingId !== null}
        onClick={() => onFolderSelect(null)}
        onDragOver={(e) => handleDragOver(e, null)}
        onDragLeave={handleDragLeave}
        onDrop={(e) => handleDrop(e, null)}
      />

      {/* Folder tree */}
      {folders.map((folder) => (
        <FolderTreeNode
          key={folder.id}
          folder={folder}
          level={0}
          selectedFolderId={selectedFolderId}
          onFolderSelect={onFolderSelect}
          onFolderMenu={onFolderMenu}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          dragOverId={dragOverId}
          draggingId={draggingId}
          draggingDescendants={draggingDescendants}
        />
      ))}

      {/* Create folder button */}
      {onCreateFolder && (
        <button
          type="button"
          onClick={() => onCreateFolder()}
          className="
            flex items-center gap-2 w-full px-2 py-1.5 mt-2
            text-xs text-muted-foreground
            hover:text-foreground hover:bg-muted
            rounded-md transition-colors
          "
        >
          <Plus className="w-3.5 h-3.5" />
          {t('folders.new')}
        </button>
      )}
    </div>
  );
}

interface FolderTreeNodeProps {
  folder: FolderTreeType;
  level: number;
  selectedFolderId?: string | null;
  onFolderSelect: (folderId: string | null) => void;
  onFolderMenu?: (folder: FolderTreeType, e: React.MouseEvent) => void;
  onDragStart: (e: React.DragEvent, folderId: string) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, targetId: string | null) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetId: string | null) => void;
  dragOverId: string | null | undefined;
  draggingId: string | null;
  draggingDescendants: Set<string>;
}

function FolderTreeNode({
  folder,
  level,
  selectedFolderId,
  onFolderSelect,
  onFolderMenu,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  dragOverId,
  draggingId,
  draggingDescendants,
}: FolderTreeNodeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = folder.children && folder.children.length > 0;
  const isSelected = selectedFolderId === folder.id;
  const isDragging = draggingId === folder.id;
  const isDragOver = dragOverId === folder.id;

  // Can this folder receive a drop?
  const canReceiveDrop = draggingId !== null &&
    draggingId !== folder.id &&
    !draggingDescendants.has(folder.id);

  return (
    <div>
      <FolderItem
        name={folder.name}
        level={level}
        isSelected={isSelected}
        isExpanded={isExpanded}
        hasChildren={hasChildren}
        isDragging={isDragging}
        isDragOver={isDragOver && canReceiveDrop}
        draggable
        onClick={() => onFolderSelect(folder.id)}
        onDoubleClick={hasChildren ? () => setIsExpanded(!isExpanded) : undefined}
        onToggle={hasChildren ? () => setIsExpanded(!isExpanded) : undefined}
        onMenu={onFolderMenu ? (e) => onFolderMenu(folder, e) : undefined}
        onDragStart={(e) => onDragStart(e, folder.id)}
        onDragEnd={onDragEnd}
        onDragOver={(e) => onDragOver(e, folder.id)}
        onDragLeave={onDragLeave}
        onDrop={(e) => onDrop(e, folder.id)}
      />

      {/* Children */}
      {hasChildren && isExpanded && (
        <div>
          {folder.children!.map((child) => (
            <FolderTreeNode
              key={child.id}
              folder={child}
              level={level + 1}
              selectedFolderId={selectedFolderId}
              onFolderSelect={onFolderSelect}
              onFolderMenu={onFolderMenu}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              dragOverId={dragOverId}
              draggingId={draggingId}
              draggingDescendants={draggingDescendants}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface FolderItemProps {
  name: string;
  level?: number;
  isRoot?: boolean;
  isSelected?: boolean;
  isExpanded?: boolean;
  hasChildren?: boolean;
  isDragging?: boolean;
  isDragOver?: boolean;
  draggable?: boolean;
  onClick: () => void;
  onDoubleClick?: () => void;
  onToggle?: () => void;
  onMenu?: (e: React.MouseEvent) => void;
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent) => void;
  onDragLeave?: (e: React.DragEvent) => void;
  onDrop?: (e: React.DragEvent) => void;
}

function FolderItem({
  name,
  level = 0,
  isRoot,
  isSelected,
  isExpanded,
  hasChildren,
  isDragging,
  isDragOver,
  draggable,
  onClick,
  onDoubleClick,
  onToggle,
  onMenu,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
}: FolderItemProps) {
  const paddingLeft = isRoot ? 8 : 8 + level * 16;

  return (
    <div
      className={`
        group flex items-center gap-1 py-1.5 pr-2 rounded-md cursor-pointer
        transition-all duration-150
        ${isDragging ? 'opacity-50' : ''}
        ${isDragOver
          ? 'bg-primary/20 ring-2 ring-primary ring-inset'
          : isSelected
            ? 'bg-primary/10 text-primary'
            : 'hover:bg-muted text-foreground'
        }
      `}
      style={{ paddingLeft }}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      draggable={draggable && !isRoot}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Expand/collapse toggle */}
      {!isRoot && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle?.();
          }}
          className={`
            p-0.5 rounded hover:bg-muted-foreground/10
            ${hasChildren ? 'visible' : 'invisible'}
          `}
        >
          {isExpanded ? (
            <ChevronDown className="w-3.5 h-3.5" />
          ) : (
            <ChevronRight className="w-3.5 h-3.5" />
          )}
        </button>
      )}

      {/* Folder icon */}
      {isRoot ? (
        <Home className="w-4 h-4 flex-shrink-0" />
      ) : isSelected || isExpanded ? (
        <FolderOpen className="w-4 h-4 flex-shrink-0" />
      ) : (
        <Folder className="w-4 h-4 flex-shrink-0" />
      )}

      {/* Name */}
      <span className="flex-1 text-sm truncate">{name}</span>

      {/* Menu button */}
      {onMenu && !isRoot && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onMenu(e);
          }}
          className="
            p-0.5 rounded opacity-0 group-hover:opacity-100
            hover:bg-muted-foreground/10 transition-opacity
          "
        >
          <MoreVertical className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
