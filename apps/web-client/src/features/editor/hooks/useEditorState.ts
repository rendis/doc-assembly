import { useEditor } from '@tiptap/react';
// @ts-expect-error - TipTap types compatibility
import type { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import Dropcursor from '@tiptap/extension-dropcursor';
import { ResizableImage } from 'tiptap-extension-resizable-image';
import Placeholder from '@tiptap/extension-placeholder';
import Link from '@tiptap/extension-link';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import {
  InjectorExtension,
  SignatureExtension,
  ConditionalExtension,
  SlashCommandsExtension,
  slashCommandsSuggestion,
  MentionExtension,
} from '../extensions';
import type { UseEditorStateOptions, UseEditorStateReturn } from '../types';

const EDITOR_PROSE_CLASS =
  'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[400px] p-4 px-10 bg-background prose-slate dark:prose-invert max-w-none';

export const useEditorState = ({
  content,
  editable = true,
  onUpdate,
}: UseEditorStateOptions): UseEditorStateReturn => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        // Disable built-in dropcursor to use custom configuration
        dropcursor: false,
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
      ResizableImage,
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

  return { editor };
};
