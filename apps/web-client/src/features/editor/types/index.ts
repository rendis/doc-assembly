// @ts-expect-error - TipTap types compatibility
import type { Editor as TiptapEditor } from '@tiptap/core';

export interface EditorProps {
  content: string;
  onChange?: (content: string) => void;
  editable?: boolean;
  onEditorReady?: (editor: TiptapEditor) => void;
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

// Document Format Types
export * from './document-format';

// Pagination Types
export * from './pagination';

// Signer Roles Types
export * from './signer-roles';
