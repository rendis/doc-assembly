import { useState, useCallback, useMemo, useEffect } from 'react';
// @ts-expect-error - TipTap types compatibility
import type { Editor } from '@tiptap/core';
import type { PageBoundary } from '../types/pagination';
import { usePaginationStore } from '../stores/pagination-store';
import { getContentArea } from '../utils/page-formats';

export const usePagination = (editor: Editor | null) => {
  const { config } = usePaginationStore();
  const [boundaries, setBoundaries] = useState<PageBoundary[]>([]);
  const [currentPage, setCurrentPage] = useState(1);

  const contentArea = useMemo(() => getContentArea(config.format), [config.format]);

  const handleBoundariesChange = useCallback((newBoundaries: PageBoundary[]) => {
    setBoundaries(newBoundaries);
  }, []);

  const goToPage = useCallback(
    (pageNumber: number) => {
      if (!editor) return;

      const boundary = boundaries.find((b) => b.pageNumber === pageNumber);
      if (boundary) {
        editor.commands.setTextSelection(boundary.startPos);
        editor.commands.scrollIntoView();
      }
    },
    [editor, boundaries]
  );

  // Update current page based on selection position
  const updateCurrentPage = useCallback(() => {
    if (!editor || boundaries.length === 0) return;

    const { from } = editor.state.selection;
    const page = boundaries.find((b) => from >= b.startPos && from <= b.endPos);
    if (page) {
      setCurrentPage(page.pageNumber);
    }
  }, [editor, boundaries]);

  // Listen to selection changes
  useEffect(() => {
    if (!editor) return;

    const handleSelectionUpdate = () => {
      updateCurrentPage();
    };

    editor.on('selectionUpdate', handleSelectionUpdate);

    return () => {
      editor.off('selectionUpdate', handleSelectionUpdate);
    };
  }, [editor, updateCurrentPage]);

  return {
    boundaries,
    currentPage,
    totalPages: boundaries.length || 1,
    contentArea,
    format: config.format,
    pageGap: config.pageGap,
    showPageNumbers: config.showPageNumbers,
    enabled: config.enabled,
    handleBoundariesChange,
    goToPage,
    updateCurrentPage,
  };
};
