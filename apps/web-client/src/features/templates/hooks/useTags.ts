import { useState, useEffect, useCallback } from 'react';
import { tagsApi } from '../api/tags-api';
import type { TagWithCount, Tag, CreateTagRequest, UpdateTagRequest } from '../types';

interface UseTagsReturn {
  // Data
  tags: TagWithCount[];

  // Loading
  isLoading: boolean;

  // Actions
  refresh: () => Promise<void>;
  createTag: (data: CreateTagRequest) => Promise<Tag>;
  updateTag: (tagId: string, data: UpdateTagRequest) => Promise<Tag>;
  deleteTag: (tagId: string) => Promise<void>;

  // Helpers
  getTagById: (tagId: string) => TagWithCount | undefined;
  getTagsByIds: (tagIds: string[]) => TagWithCount[];
}

export function useTags(): UseTagsReturn {
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch tags
  const fetchTags = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await tagsApi.list();
      setTags(response.data);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
      setTags([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  // Create tag
  const createTag = useCallback(async (data: CreateTagRequest): Promise<Tag> => {
    const tag = await tagsApi.create(data);
    await fetchTags();
    return tag;
  }, [fetchTags]);

  // Update tag
  const updateTag = useCallback(async (tagId: string, data: UpdateTagRequest): Promise<Tag> => {
    const tag = await tagsApi.update(tagId, data);
    await fetchTags();
    return tag;
  }, [fetchTags]);

  // Delete tag
  const deleteTag = useCallback(async (tagId: string): Promise<void> => {
    await tagsApi.delete(tagId);
    await fetchTags();
  }, [fetchTags]);

  // Get tag by ID
  const getTagById = useCallback((tagId: string): TagWithCount | undefined => {
    return tags.find((t) => t.id === tagId);
  }, [tags]);

  // Get tags by IDs
  const getTagsByIds = useCallback((tagIds: string[]): TagWithCount[] => {
    return tags.filter((t) => tagIds.includes(t.id));
  }, [tags]);

  return {
    tags,
    isLoading,
    refresh: fetchTags,
    createTag,
    updateTag,
    deleteTag,
    getTagById,
    getTagsByIds,
  };
}

// Predefined tag colors for the color picker
export const TAG_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#64748b', // slate
];
