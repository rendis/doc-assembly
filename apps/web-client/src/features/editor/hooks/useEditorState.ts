import { useEditor } from '@tiptap/react';
import { useEffect } from 'react';
// @ts-expect-error - TipTap types compatibility
import type { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Dropcursor from '@tiptap/extension-dropcursor';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import PaginationExtension, { PageNode, HeaderFooterNode, BodyNode } from 'tiptap-extension-pagination';
import {
  InjectorExtension,
  SignatureExtension,
  ConditionalExtension,
  PageBreakHR,
  SlashCommandsExtension,
  slashCommandsSuggestion,
  MentionExtension,
  ImageExtension,
} from '../extensions';
import { usePaginationStore } from '../stores/pagination-store';
import type { UseEditorStateOptions, UseEditorStateReturn } from '../types';

const EDITOR_PROSE_CLASS =
  'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl focus:outline-none min-h-screen bg-transparent prose-slate dark:prose-invert max-w-none';

export const useEditorState = ({
  content,
  editable = true,
  onUpdate,
}: UseEditorStateOptions): UseEditorStateReturn => {
  const { config } = usePaginationStore();

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable built-in dropcursor to use custom configuration
        dropcursor: false,
        // Disable built-in link to avoid duplicate extension warning
        link: false,
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
      }),
      // Custom dropcursor with better styling
      Dropcursor.configure({
        color: 'hsl(var(--primary))',
        width: 2,
        class: 'tiptap-dropcursor',
      }),
      // Pagination extension - visual page separation
      PaginationExtension.configure({
        defaultPaperSize: 'A4',
        defaultPaperOrientation: 'portrait',
        useDeviceThemeForPaperColour: true, // Auto-detect dark/light mode
        defaultMarginConfig: {
          top: config.format.margins.top / 3.78, // px to mm (approx)
          bottom: config.format.margins.bottom / 3.78,
          left: config.format.margins.left / 3.78,
          right: config.format.margins.right / 3.78,
        },
        pageAmendmentOptions: {
          enableHeader: false,
          enableFooter: false,
        },
      }),
      PageNode,
      HeaderFooterNode,
      BodyNode,
      ImageExtension.configure({
        inline: false,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary underline cursor-pointer',
        },
      }),
      Highlight.configure({
        multicolor: false,
        HTMLAttributes: {
          class: 'bg-yellow-200 dark:bg-yellow-800',
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Placeholder.configure({
        placeholder: 'Escribe "/" para comandos o "@" para mencionar variables...',
      }),
      InjectorExtension,
      SignatureExtension,
      ConditionalExtension,
      PageBreakHR,
      SlashCommandsExtension.configure({
        suggestion: slashCommandsSuggestion,
      }),
      MentionExtension,
    ],
    content,
    editable,
    onUpdate: ({ editor }: { editor: Editor }) => {
      onUpdate?.(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: EDITOR_PROSE_CLASS,
      },
    },
  });

  // Dynamically adjust container height for multiple pages
  useEffect(() => {
    if (!editor) return;

    const updatePageHeight = () => {
      const container = editor.view.dom as HTMLElement;
      const pageBreaks = container.querySelectorAll('.page-break');
      const pageHeight = config.format.height;

      if (pageBreaks.length === 0) {
        // 1 page - remove inline style, let CSS handle it
        container.style.removeProperty('min-height');
        return;
      }

      // Calculate total height: pages + page-break heights
      const totalPages = pageBreaks.length + 1;
      const pageBreakHeight = 80; // 40px height + 20px*2 margins
      const totalHeight = totalPages * pageHeight + pageBreaks.length * pageBreakHeight;

      // Use setProperty with 'important' to override CSS !important
      container.style.setProperty('min-height', `${totalHeight}px`, 'important');
    };

    const observer = new MutationObserver(updatePageHeight);
    observer.observe(editor.view.dom, { childList: true, subtree: true });

    updatePageHeight();

    return () => observer.disconnect();
  }, [editor, config.format.height]);

  return { editor };
};
