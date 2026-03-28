import { act, renderHook, waitFor } from '@testing-library/react'
import type { Editor } from '@tiptap/core'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAutoSave } from './useAutoSave'
import { versionsApi } from '@/features/templates/api/templates-api'
import { exportDocument } from '../services/document-export'
import { useDocumentHeaderStore } from '../stores/document-header-store'
import { usePaginationStore } from '../stores/pagination-store'
import { useSignerRolesStore } from '../stores/signer-roles-store'

vi.mock('@/features/templates/api/templates-api', () => ({
  versionsApi: {
    update: vi.fn(),
  },
}))

vi.mock('../services/document-export', () => ({
  exportDocument: vi.fn(),
}))

function createEditorStub(): Editor {
  const listeners = new Map<string, Set<() => void>>()

  return {
    on: vi.fn((event: string, handler: () => void) => {
      const handlers = listeners.get(event) ?? new Set<() => void>()
      handlers.add(handler)
      listeners.set(event, handlers)
    }),
    off: vi.fn((event: string, handler: () => void) => {
      listeners.get(event)?.delete(handler)
    }),
  } as unknown as Editor
}

describe('useAutoSave', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    useDocumentHeaderStore.getState().reset()
    usePaginationStore.getState().reset()
    useSignerRolesStore.getState().reset()
    vi.mocked(exportDocument).mockReturnValue({} as never)
    vi.mocked(versionsApi.update).mockResolvedValue(undefined as never)
  })

  it('autosaves header-only changes with the same debounce as body changes', async () => {
    const editor = createEditorStub()

    renderHook(() =>
      useAutoSave({
        editor,
        templateId: 'template-1',
        versionId: 'version-1',
        enabled: true,
        debounceMs: 20,
        meta: { title: 'Header Doc' },
      })
    )

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 120))
    })

    act(() => {
      useDocumentHeaderStore.getState().setLayout('image-right')
    })

    await waitFor(() => expect(versionsApi.update).toHaveBeenCalledTimes(1))
  })

  it('ensureSaved flushes pending header autosave before preview can continue', async () => {
    const editor = createEditorStub()

    const { result } = renderHook(() =>
      useAutoSave({
        editor,
        templateId: 'template-1',
        versionId: 'version-1',
        enabled: true,
        debounceMs: 1_000,
        meta: { title: 'Preview Doc' },
      })
    )

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 120))
    })

    act(() => {
      useDocumentHeaderStore.getState().setImage('https://example.com/logo.png', 'Logo')
    })

    expect(versionsApi.update).not.toHaveBeenCalled()

    await act(async () => {
      await result.current.ensureSaved()
    })

    await waitFor(() => expect(versionsApi.update).toHaveBeenCalledTimes(1))
  })
})
