import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CancelDocumentDialog } from './CancelDocumentDialog'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string, opts?: Record<string, string>) => {
      if (opts?.title) {
        return fallback.replace('{{title}}', opts.title)
      }
      return fallback
    },
  }),
}))

// Mock useToast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

// Track mutateAsync calls
const mockMutateAsync = vi.fn().mockResolvedValue(undefined)

// Mock the hooks module
vi.mock('../hooks/useSigningDocuments', () => ({
  useCancelDocument: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    )
  }
}

describe('CancelDocumentDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not render content when open is false', () => {
    render(
      <CancelDocumentDialog
        open={false}
        onOpenChange={vi.fn()}
        documentId="doc-1"
        documentTitle="Test Doc"
      />,
      { wrapper: createWrapper() },
    )
    expect(screen.queryByText('Cancel Document')).toBeNull()
  })

  it('renders dialog content when open is true', () => {
    render(
      <CancelDocumentDialog
        open={true}
        onOpenChange={vi.fn()}
        documentId="doc-1"
        documentTitle="Test Doc"
      />,
      { wrapper: createWrapper() },
    )
    // "Cancel Document" appears both as title and confirm button
    expect(screen.getAllByText('Cancel Document').length).toBeGreaterThanOrEqual(1)
    expect(
      screen.getByText('Are you sure you want to cancel "Test Doc"?'),
    ).toBeDefined()
    expect(
      screen.getByText(
        'This action cannot be undone. All pending signatures will be cancelled.',
      ),
    ).toBeDefined()
  })

  it('calls onOpenChange(false) when Close button is clicked', async () => {
    const onOpenChange = vi.fn()
    render(
      <CancelDocumentDialog
        open={true}
        onOpenChange={onOpenChange}
        documentId="doc-1"
        documentTitle="Test Doc"
      />,
      { wrapper: createWrapper() },
    )

    // Two "Close" buttons exist: the footer text button and the X icon button.
    // The footer button has the visible "Close" text as direct content.
    const closeButtons = screen.getAllByRole('button', { name: 'Close' })
    // Click the first one (the footer button appears first in DOM due to dialog structure)
    await userEvent.click(closeButtons[0])
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('calls mutateAsync with documentId when confirm button is clicked', async () => {
    const onOpenChange = vi.fn()
    render(
      <CancelDocumentDialog
        open={true}
        onOpenChange={onOpenChange}
        documentId="doc-123"
        documentTitle="Test Doc"
      />,
      { wrapper: createWrapper() },
    )

    // The confirm button text is "Cancel Document" (the second one, in the footer)
    const buttons = screen.getAllByText('Cancel Document')
    // The last one is the confirm button in the footer
    await userEvent.click(buttons[buttons.length - 1])

    expect(mockMutateAsync).toHaveBeenCalledWith('doc-123')
  })

  it('calls onSuccess callback after successful cancellation', async () => {
    const onSuccess = vi.fn()
    render(
      <CancelDocumentDialog
        open={true}
        onOpenChange={vi.fn()}
        documentId="doc-1"
        documentTitle="Test Doc"
        onSuccess={onSuccess}
      />,
      { wrapper: createWrapper() },
    )

    const buttons = screen.getAllByText('Cancel Document')
    await userEvent.click(buttons[buttons.length - 1])

    expect(onSuccess).toHaveBeenCalled()
  })

  it('shows warning about irreversibility', () => {
    render(
      <CancelDocumentDialog
        open={true}
        onOpenChange={vi.fn()}
        documentId="doc-1"
        documentTitle="Test Doc"
      />,
      { wrapper: createWrapper() },
    )
    expect(
      screen.getByText(
        'This action cannot be undone. All pending signatures will be cancelled.',
      ),
    ).toBeDefined()
  })
})
