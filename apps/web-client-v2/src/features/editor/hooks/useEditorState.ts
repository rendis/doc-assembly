import { useState, useCallback, useEffect } from 'react'
import type { Editor } from '@tiptap/react'

interface UseEditorStateOptions {
  editor: Editor | null
  autoSaveDelay?: number
  onAutoSave?: (content: string) => Promise<void>
}

export function useEditorState({
  editor,
  autoSaveDelay = 3000,
  onAutoSave,
}: UseEditorStateOptions) {
  const [isDirty, setIsDirty] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | undefined>()
  const [isSaving, setIsSaving] = useState(false)

  // Track content changes
  useEffect(() => {
    if (!editor) return

    const handleUpdate = () => {
      setIsDirty(true)
    }

    editor.on('update', handleUpdate)
    return () => {
      editor.off('update', handleUpdate)
    }
  }, [editor])

  // Auto-save functionality
  useEffect(() => {
    if (!editor || !isDirty || !onAutoSave) return

    const timer = setTimeout(async () => {
      setIsSaving(true)
      try {
        await onAutoSave(editor.getHTML())
        setIsDirty(false)
        setLastSaved(new Date())
      } finally {
        setIsSaving(false)
      }
    }, autoSaveDelay)

    return () => clearTimeout(timer)
  }, [editor, isDirty, autoSaveDelay, onAutoSave])

  const save = useCallback(async () => {
    if (!editor || !onAutoSave) return

    setIsSaving(true)
    try {
      await onAutoSave(editor.getHTML())
      setIsDirty(false)
      setLastSaved(new Date())
    } finally {
      setIsSaving(false)
    }
  }, [editor, onAutoSave])

  return {
    isDirty,
    isSaving,
    lastSaved,
    save,
  }
}
