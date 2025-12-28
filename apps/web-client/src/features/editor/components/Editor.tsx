import { EditorContent } from '@tiptap/react';
import { EditorToolbar } from './EditorToolbar';
import { useEditorState } from '../hooks/useEditorState';
import type { EditorProps } from '../types';

export const Editor = ({ content, onChange, editable = true }: EditorProps) => {
  const { editor } = useEditorState({
    content,
    editable,
    onUpdate: onChange,
  });

  if (!editor) return null;

  return (
    <div className="border rounded-lg overflow-hidden flex flex-col bg-white dark:bg-slate-900 dark:border-slate-700 shadow-sm">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
};