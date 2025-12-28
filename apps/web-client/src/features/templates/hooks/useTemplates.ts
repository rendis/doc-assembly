import { useState, useEffect, useCallback } from 'react';
import { templatesApi } from '../api/templates-api';
import { tagsApi } from '../api/tags-api';
import type { TemplateListItem, TagWithCount, TemplateListParams, Tag } from '../types';

interface UseTemplatesOptions {
  initialFolderId?: string | null;
  limit?: number;
}

interface UseTemplatesReturn {
  // Data
  templates: TemplateListItem[];
  totalCount: number;
  tags: TagWithCount[];
  templateTags: Map<string, Tag[]>;

  // Loading states
  isLoading: boolean;
  isLoadingTags: boolean;

  // Filters
  filters: TemplateListParams;
  setSearch: (search: string) => void;
  setFolderId: (folderId: string | null) => void;
  setTagIds: (tagIds: string[]) => void;
  setHasPublishedVersion: (value: boolean | undefined) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;

  // Pagination
  page: number;
  totalPages: number;
  setPage: (page: number) => void;

  // Actions
  refresh: () => Promise<void>;
}

const DEFAULT_LIMIT = 12;

export function useTemplates(options: UseTemplatesOptions = {}): UseTemplatesReturn {
  const { initialFolderId, limit = DEFAULT_LIMIT } = options;

  // State
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [tags, setTags] = useState<TagWithCount[]>([]);
  const [templateTags] = useState<Map<string, Tag[]>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [page, setPage] = useState(1);

  // Filters
  const [filters, setFilters] = useState<TemplateListParams>({
    folderId: initialFolderId ?? undefined,
    search: '',
    tagIds: [],
    hasPublishedVersion: undefined,
  });

  // Fetch templates
  const fetchTemplates = useCallback(async () => {
    setIsLoading(true);
    try {
      const offset = (page - 1) * limit;
      const response = await templatesApi.list({
        ...filters,
        limit,
        offset,
      });
      setTemplates(response.data);
      setTotalCount(response.count);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      setTemplates([]);
      setTotalCount(0);
    } finally {
      setIsLoading(false);
    }
  }, [filters, page, limit]);

  // Fetch tags
  const fetchTags = useCallback(async () => {
    setIsLoadingTags(true);
    try {
      const response = await tagsApi.list();
      setTags(response.data);
    } catch (error) {
      console.error('Failed to fetch tags:', error);
      setTags([]);
    } finally {
      setIsLoadingTags(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters.folderId, filters.search, filters.tagIds, filters.hasPublishedVersion]);

  // Filter setters
  const setSearch = useCallback((search: string) => {
    setFilters((prev) => ({ ...prev, search }));
  }, []);

  const setFolderId = useCallback((folderId: string | null) => {
    setFilters((prev) => {
      const newFolderId = folderId ?? undefined;
      // Only update if the folder actually changed
      if (prev.folderId === newFolderId) {
        return prev;
      }
      return { ...prev, folderId: newFolderId };
    });
  }, []);

  const setTagIds = useCallback((tagIds: string[]) => {
    setFilters((prev) => ({ ...prev, tagIds }));
  }, []);

  const setHasPublishedVersion = useCallback((hasPublishedVersion: boolean | undefined) => {
    setFilters((prev) => ({ ...prev, hasPublishedVersion }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({
      folderId: undefined,
      search: '',
      tagIds: [],
      hasPublishedVersion: undefined,
    });
  }, []);

  const hasActiveFilters =
    !!filters.search ||
    (filters.tagIds?.length ?? 0) > 0 ||
    filters.hasPublishedVersion !== undefined;

  const totalPages = Math.ceil(totalCount / limit);

  const refresh = useCallback(async () => {
    await Promise.all([fetchTemplates(), fetchTags()]);
  }, [fetchTemplates, fetchTags]);

  return {
    templates,
    totalCount,
    tags,
    templateTags,
    isLoading,
    isLoadingTags,
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
    refresh,
  };
}
