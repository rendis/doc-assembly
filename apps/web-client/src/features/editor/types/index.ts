// @ts-ignore
import type { Editor as TiptapEditor } from '@tiptap/core';

export interface EditorProps {
  content: string;
  onChange?: (content: string) => void;
  editable?: boolean;
}

export interface EditorToolbarProps {
  editor: TiptapEditor;
}

export interface UseEditorStateOptions {
  content: string;
  editable?: boolean;
  onUpdate?: (html: string) => void;
}

export interface UseEditorStateReturn {
  editor: TiptapEditor | null;
}
