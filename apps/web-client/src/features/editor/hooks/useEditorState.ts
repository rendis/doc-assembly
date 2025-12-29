import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { ResizableImage } from 'tiptap-extension-resizable-image';
import { InjectorExtension, SignatureExtension, ConditionalExtension } from '../extensions';
import type { UseEditorStateOptions, UseEditorStateReturn } from '../types';

const EDITOR_PROSE_CLASS =
  'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none min-h-[400px] p-4 bg-background prose-slate dark:prose-invert max-w-none';

export const useEditorState = ({
  content,
  editable = true,
  onUpdate,
}: UseEditorStateOptions): UseEditorStateReturn => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      ResizableImage,
      InjectorExtension,
      SignatureExtension,
      ConditionalExtension,
    ],
    content,
    editable,
    onUpdate: ({ editor }: { editor: any }) => {
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
