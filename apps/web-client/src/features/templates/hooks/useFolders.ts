import { useState, useEffect, useCallback } from 'react';
import { foldersApi } from '../api/folders-api';
import type { FolderTree, Folder, CreateFolderRequest } from '../types';

interface UseFoldersReturn {
  // Data
  folders: FolderTree[];
  flatFolders: Folder[];

  // Loading
  isLoading: boolean;

  // Actions
  refresh: () => Promise<void>;
  createFolder: (data: CreateFolderRequest) => Promise<Folder>;
  updateFolder: (folderId: string, name: string) => Promise<Folder>;
  deleteFolder: (folderId: string) => Promise<void>;
  moveFolder: (folderId: string, newParentId: string | undefined) => Promise<Folder>;

  // Helpers
  getFolderPath: (folderId: string) => Folder[];
  getFolderById: (folderId: string) => Folder | undefined;
}

export function useFolders(): UseFoldersReturn {
  const [folders, setFolders] = useState<FolderTree[]>([]);
  const [flatFolders, setFlatFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Flatten folder tree for easy lookup
  const flattenFolders = useCallback((tree: FolderTree[]): Folder[] => {
    const result: Folder[] = [];
    const traverse = (nodes: FolderTree[]) => {
      for (const node of nodes) {
        result.push({
          id: node.id,
          workspaceId: node.workspaceId,
          parentId: node.parentId,
          name: node.name,
          createdAt: node.createdAt,
          updatedAt: node.updatedAt,
        });
        if (node.children) {
          traverse(node.children);
        }
      }
    };
    traverse(tree);
    return result;
  }, []);

  // Fetch folder tree
  const fetchFolders = useCallback(async () => {
    setIsLoading(true);
    try {
      const tree = await foldersApi.getTree();
      setFolders(tree);
      setFlatFolders(flattenFolders(tree));
    } catch (error) {
      console.error('Failed to fetch folders:', error);
      setFolders([]);
      setFlatFolders([]);
    } finally {
      setIsLoading(false);
    }
  }, [flattenFolders]);

  // Initial load
  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  // Create folder
  const createFolder = useCallback(async (data: CreateFolderRequest): Promise<Folder> => {
    const folder = await foldersApi.create(data);
    await fetchFolders();
    return folder;
  }, [fetchFolders]);

  // Update folder
  const updateFolder = useCallback(async (folderId: string, name: string): Promise<Folder> => {
    const folder = await foldersApi.update(folderId, { name });
    await fetchFolders();
    return folder;
  }, [fetchFolders]);

  // Delete folder
  const deleteFolder = useCallback(async (folderId: string): Promise<void> => {
    await foldersApi.delete(folderId);
    await fetchFolders();
  }, [fetchFolders]);

  // Move folder
  const moveFolder = useCallback(async (
    folderId: string,
    newParentId: string | undefined
  ): Promise<Folder> => {
    const folder = await foldersApi.move(folderId, { newParentId });
    await fetchFolders();
    return folder;
  }, [fetchFolders]);

  // Get folder path (breadcrumb)
  const getFolderPath = useCallback((folderId: string): Folder[] => {
    const path: Folder[] = [];
    let currentId: string | undefined = folderId;

    while (currentId) {
      const folder = flatFolders.find((f) => f.id === currentId);
      if (folder) {
        path.unshift(folder);
        currentId = folder.parentId;
      } else {
        break;
      }
    }

    return path;
  }, [flatFolders]);

  // Get folder by ID
  const getFolderById = useCallback((folderId: string): Folder | undefined => {
    return flatFolders.find((f) => f.id === folderId);
  }, [flatFolders]);

  return {
    folders,
    flatFolders,
    isLoading,
    refresh: fetchFolders,
    createFolder,
    updateFolder,
    deleteFolder,
    moveFolder,
    getFolderPath,
    getFolderById,
  };
}
