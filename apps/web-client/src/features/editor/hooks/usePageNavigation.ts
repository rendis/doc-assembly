import { useState, useEffect, useCallback, useRef } from 'react';
// @ts-expect-error - TipTap types export issue in strict mode
import type { Editor } from '@tiptap/core';
import { usePaginationStore } from '../stores/pagination-store';

interface UsePageNavigationReturn {
  currentPage: number;
  totalPages: number;
  goToPage: (page: number) => void;
}

export function usePageNavigation(editor: Editor | null): UsePageNavigationReturn {
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const { config } = usePaginationStore();
  const scrollContainerRef = useRef<HTMLElement | null>(null);

  // Find the scroll container
  useEffect(() => {
    if (!editor) return;

    const editorDom = editor.view.dom;
    const scrollContainer = editorDom.closest('.editor-scroll-container') as HTMLElement;
    scrollContainerRef.current = scrollContainer;
  }, [editor]);

  // Observe page breaks to count pages
  useEffect(() => {
    if (!editor) return;

    const updatePageCount = () => {
      const pageBreaks = editor.view.dom.querySelectorAll('.page-break');
      setTotalPages(pageBreaks.length + 1);
    };

    // Initial count
    updatePageCount();

    // Observe DOM changes
    const observer = new MutationObserver(updatePageCount);
    observer.observe(editor.view.dom, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, [editor]);

  // Track current page based on scroll position
  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || totalPages <= 1) return;

    const pageHeight = config.format.height;
    const pageBreakHeight = 80; // 40px height + 40px margins
    const pageWithBreakHeight = pageHeight + pageBreakHeight;

    const handleScroll = () => {
      const scrollTop = scrollContainer.scrollTop;
      const viewportMiddle = scrollTop + scrollContainer.clientHeight / 2;

      // Calculate which page the viewport middle is on
      const page = Math.floor(viewportMiddle / pageWithBreakHeight) + 1;
      const clampedPage = Math.max(1, Math.min(page, totalPages));

      if (clampedPage !== currentPage) {
        setCurrentPage(clampedPage);
      }
    };

    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation

    return () => scrollContainer.removeEventListener('scroll', handleScroll);
  }, [totalPages, config.format.height, currentPage]);

  // Navigate to a specific page
  const goToPage = useCallback((page: number) => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer || page < 1 || page > totalPages) return;

    const pageHeight = config.format.height;
    const pageBreakHeight = 80;
    const pageWithBreakHeight = pageHeight + pageBreakHeight;

    const targetScroll = (page - 1) * pageWithBreakHeight;

    scrollContainer.scrollTo({
      top: targetScroll,
      behavior: 'smooth',
    });

    setCurrentPage(page);
  }, [totalPages, config.format.height]);

  return {
    currentPage,
    totalPages,
    goToPage,
  };
}
