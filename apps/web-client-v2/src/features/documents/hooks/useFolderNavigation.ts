import { useCallback, useMemo } from 'react'
import { useNavigate, useSearch, useParams } from '@tanstack/react-router'
import { useFolderTree, useFolder } from './useFolders'
import type { Folder, FolderTree } from '@/types/api'

export interface BreadcrumbItem {
  id: string | null
  label: string
}

export interface FolderNavigationState {
  currentFolderId: string | null
  currentFolder: Folder | undefined
  breadcrumbs: BreadcrumbItem[]
  isLoading: boolean
  navigateToFolder: (folderId: string | null) => void
  navigateUp: () => void
}

export function useFolderNavigation(workspaceId: string): FolderNavigationState {
  const navigate = useNavigate()
  const params = useParams({ strict: false }) as { workspaceId?: string }
  const search = useSearch({ strict: false }) as { folderId?: string }

  const currentFolderId = search.folderId ?? null
  const currentWorkspaceId = params.workspaceId ?? workspaceId

  const { data: currentFolder, isLoading: folderLoading } = useFolder(currentFolderId)
  const { data: tree, isLoading: treeLoading } = useFolderTree(workspaceId)

  // Build breadcrumbs from tree structure
  const breadcrumbs = useMemo(() => {
    const path: BreadcrumbItem[] = [{ id: null, label: 'Documents' }]

    if (!currentFolderId || !tree) {
      return path
    }

    // Find path to current folder in tree
    const findPath = (
      nodes: FolderTree[],
      targetId: string
    ): FolderTree[] | null => {
      for (const node of nodes) {
        if (node.id === targetId) {
          return [node]
        }
        if (node.children && node.children.length > 0) {
          const childPath = findPath(node.children, targetId)
          if (childPath) {
            return [node, ...childPath]
          }
        }
      }
      return null
    }

    const folderPath = findPath(tree, currentFolderId)
    if (folderPath) {
      path.push(...folderPath.map((f) => ({ id: f.id, label: f.name })))
    }

    return path
  }, [tree, currentFolderId])

  const navigateToFolder = useCallback(
    (folderId: string | null) => {
      navigate({
        to: '/workspace/$workspaceId/documents',
        params: { workspaceId: currentWorkspaceId },
        search: folderId ? { folderId } : undefined,
      })
    },
    [navigate, currentWorkspaceId]
  )

  const navigateUp = useCallback(() => {
    if (currentFolder?.parentId) {
      navigateToFolder(currentFolder.parentId)
    } else {
      navigateToFolder(null)
    }
  }, [currentFolder, navigateToFolder])

  return {
    currentFolderId,
    currentFolder,
    breadcrumbs,
    isLoading: folderLoading || treeLoading,
    navigateToFolder,
    navigateUp,
  }
}
