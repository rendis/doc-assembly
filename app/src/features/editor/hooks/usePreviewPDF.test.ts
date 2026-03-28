import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePreviewPDF } from './usePreviewPDF'
import { previewApi } from '../api/preview-api'

vi.mock('../api/preview-api', () => ({
  previewApi: {
    generate: vi.fn(),
  },
}))

describe('usePreviewPDF', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(previewApi.generate).mockResolvedValue(new Blob(['pdf'], { type: 'application/pdf' }))
  })

  it('waits for beforeGenerate before requesting the saved-only preview', async () => {
    const beforeGenerate = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          setTimeout(resolve, 20)
        })
    )

    const { result } = renderHook(() =>
      usePreviewPDF({
        templateId: 'template-1',
        versionId: 'version-1',
        beforeGenerate,
      })
    )

    act(() => {
      void result.current.generatePreview({})
    })

    expect(beforeGenerate).toHaveBeenCalledTimes(1)
    expect(previewApi.generate).not.toHaveBeenCalled()

    await waitFor(() => expect(previewApi.generate).toHaveBeenCalledTimes(1))
  })
})
