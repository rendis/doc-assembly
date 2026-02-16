import { describe, it, expect, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { signingKeys, useSigningDocuments, useSigningDocument } from './useSigningDocuments'
import type { SigningDocumentListItem, SigningDocumentDetail } from '../types'

// Mock the API module
vi.mock('../api/signing-api', () => ({
  signingApi: {
    list: vi.fn(),
    getById: vi.fn(),
    create: vi.fn(),
    cancel: vi.fn(),
    refresh: vi.fn(),
    getSigningURL: vi.fn(),
  },
}))

// Import the mocked module so we can control return values
import { signingApi } from '../api/signing-api'

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('signingKeys', () => {
  it('generates correct query keys', () => {
    expect(signingKeys.all).toEqual(['signing-documents'])
    expect(signingKeys.lists()).toEqual(['signing-documents', 'list'])
    expect(signingKeys.list({ status: 'PENDING' })).toEqual([
      'signing-documents',
      'list',
      { status: 'PENDING' },
    ])
    expect(signingKeys.details()).toEqual(['signing-documents', 'detail'])
    expect(signingKeys.detail('abc')).toEqual([
      'signing-documents',
      'detail',
      'abc',
    ])
    expect(signingKeys.statistics()).toEqual([
      'signing-documents',
      'statistics',
    ])
    expect(signingKeys.events('doc-1')).toEqual([
      'signing-documents',
      'events',
      'doc-1',
    ])
  })
})

describe('useSigningDocuments', () => {
  it('fetches document list via signingApi.list', async () => {
    const mockData: SigningDocumentListItem[] = [
      {
        id: 'doc-1',
        workspaceId: 'ws-1',
        templateVersionId: 'tv-1',
        title: 'Test Doc',
        status: 'PENDING',
        createdAt: '2026-01-01T00:00:00Z',
        updatedAt: '2026-01-01T00:00:00Z',
      },
    ]
    vi.mocked(signingApi.list).mockResolvedValueOnce(mockData)

    const { result } = renderHook(() => useSigningDocuments(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockData)
    expect(signingApi.list).toHaveBeenCalledWith(undefined)
  })

  it('passes filters to signingApi.list', async () => {
    vi.mocked(signingApi.list).mockResolvedValueOnce([])

    const filters = { status: 'COMPLETED', search: 'hello' }
    const { result } = renderHook(() => useSigningDocuments(filters), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(signingApi.list).toHaveBeenCalledWith(filters)
  })
})

describe('useSigningDocument', () => {
  it('fetches single document by id', async () => {
    const mockDetail: SigningDocumentDetail = {
      id: 'doc-1',
      workspaceId: 'ws-1',
      templateVersionId: 'tv-1',
      title: 'Test Doc',
      status: 'PENDING',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
      recipients: [],
    }
    vi.mocked(signingApi.getById).mockResolvedValueOnce(mockDetail)

    const { result } = renderHook(() => useSigningDocument('doc-1'), {
      wrapper: createWrapper(),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual(mockDetail)
    expect(signingApi.getById).toHaveBeenCalledWith('doc-1')
  })

  it('does not fetch when id is empty', () => {
    // Clear any prior mock calls
    vi.mocked(signingApi.getById).mockClear()

    const { result } = renderHook(() => useSigningDocument(''), {
      wrapper: createWrapper(),
    })

    // enabled: !!id is false, so it should not fetch
    expect(result.current.fetchStatus).toBe('idle')
  })
})
