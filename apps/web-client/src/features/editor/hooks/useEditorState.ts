import { useEditor } from '@tiptap/react';
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
import { PaginationPlus } from 'tiptap-pagination-plus';
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
      PaginationPlus.configure({
        pageHeight: config.format.height,
        pageWidth: config.format.width,
        marginTop: config.format.margins.top,
        marginBottom: config.format.margins.bottom,
        marginLeft: config.format.margins.left,
        marginRight: config.format.margins.right,
        pageGap: config.pageGap,
        headerLeft: '',
        headerRight: '',
        footerLeft: '',
        footerRight: '',
      }),
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

  // Note: tiptap-pagination-plus handles page height internally
  // The MutationObserver was causing infinite loops with the new extension

  return { editor };
};
