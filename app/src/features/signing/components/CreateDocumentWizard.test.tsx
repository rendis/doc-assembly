import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { CreateDocumentWizard } from './CreateDocumentWizard'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
}))

// Mock useCreateDocument
vi.mock('../hooks/useSigningDocuments', () => ({
  useCreateDocument: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}))

// Mock useTemplateWithVersions
vi.mock('@/features/templates/hooks/useTemplateDetail', () => ({
  useTemplateWithVersions: () => ({
    data: null,
  }),
}))

// Mock child wizard step components to simplify tests
vi.mock('./WizardStepVersion', () => ({
  WizardStepVersion: () => <div data-testid="step-version">Version Step</div>,
}))

vi.mock('./WizardStepValues', () => ({
  WizardStepValues: () => <div data-testid="step-values">Values Step</div>,
}))

vi.mock('./WizardStepRecipients', () => ({
  WizardStepRecipients: () => (
    <div data-testid="step-recipients">Recipients Step</div>
  ),
}))

vi.mock('./WizardStepReview', () => ({
  WizardStepReview: () => <div data-testid="step-review">Review Step</div>,
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

describe('CreateDocumentWizard', () => {
  it('does not render when open is false', () => {
    render(
      <CreateDocumentWizard
        open={false}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() },
    )
    expect(screen.queryByText('Create Signing Document')).toBeNull()
  })

  it('renders dialog title and first step when open', () => {
    render(
      <CreateDocumentWizard
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() },
    )
    expect(screen.getByText('Create Signing Document')).toBeDefined()
    expect(screen.getByTestId('step-version')).toBeDefined()
  })

  it('shows step indicators', () => {
    render(
      <CreateDocumentWizard
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() },
    )
    // "Template & Version" appears in both the step indicator and description
    expect(screen.getAllByText(/Template & Version/).length).toBeGreaterThanOrEqual(1)
    // These step labels appear in the indicator bar
    expect(screen.getAllByText(/Values/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Recipients/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/Review/).length).toBeGreaterThanOrEqual(1)
  })

  it('shows Document Title input on first step', () => {
    render(
      <CreateDocumentWizard
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() },
    )
    expect(
      screen.getByPlaceholderText('Enter document title...'),
    ).toBeDefined()
  })

  it('Next button is disabled when title is empty (first step)', () => {
    render(
      <CreateDocumentWizard
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() },
    )
    const nextButton = screen.getByText('Next')
    expect((nextButton as HTMLButtonElement).disabled).toBe(true)
  })

  it('does not show Back button on first step', () => {
    render(
      <CreateDocumentWizard
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() },
    )
    expect(screen.queryByText('Back')).toBeNull()
  })

  it('allows typing a document title', async () => {
    render(
      <CreateDocumentWizard
        open={true}
        onOpenChange={vi.fn()}
      />,
      { wrapper: createWrapper() },
    )
    const titleInput = screen.getByPlaceholderText('Enter document title...')
    await userEvent.type(titleInput, 'My Contract')
    expect((titleInput as HTMLInputElement).value).toBe('My Contract')
  })
})
