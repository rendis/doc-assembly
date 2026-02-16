import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { RecipientTable } from './RecipientTable'
import type { SigningRecipient } from '../types'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
}))

// Mock useToast
vi.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({ toast: vi.fn() }),
}))

// Mock signing API
vi.mock('../api/signing-api', () => ({
  signingApi: {
    getSigningURL: vi.fn(),
  },
}))

const makeRecipient = (
  overrides: Partial<SigningRecipient> = {},
): SigningRecipient => ({
  id: 'r1',
  roleId: 'role-1',
  roleName: 'Signer',
  name: 'John Doe',
  email: 'john@example.com',
  status: 'PENDING',
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
  ...overrides,
})

describe('RecipientTable', () => {
  it('shows empty state when no recipients', () => {
    render(<RecipientTable documentId="doc-1" recipients={[]} />)
    expect(screen.getByText('No recipients')).toBeDefined()
  })

  it('renders table headers', () => {
    render(
      <RecipientTable
        documentId="doc-1"
        recipients={[makeRecipient()]}
      />,
    )
    expect(screen.getByText('Name')).toBeDefined()
    expect(screen.getByText('Email')).toBeDefined()
    expect(screen.getByText('Role')).toBeDefined()
    expect(screen.getByText('Status')).toBeDefined()
    expect(screen.getByText('Signed At')).toBeDefined()
    expect(screen.getByText('Actions')).toBeDefined()
  })

  it('renders recipient name, email, and role', () => {
    render(
      <RecipientTable
        documentId="doc-1"
        recipients={[
          makeRecipient({
            name: 'Alice Smith',
            email: 'alice@example.com',
            roleName: 'Approver',
          }),
        ]}
      />,
    )
    expect(screen.getByText('Alice Smith')).toBeDefined()
    expect(screen.getByText('alice@example.com')).toBeDefined()
    expect(screen.getByText('Approver')).toBeDefined()
  })

  it('renders recipient status badge', () => {
    render(
      <RecipientTable
        documentId="doc-1"
        recipients={[makeRecipient({ status: 'SIGNED' })]}
      />,
    )
    expect(screen.getByText('Signed')).toBeDefined()
  })

  it('renders multiple recipients', () => {
    render(
      <RecipientTable
        documentId="doc-1"
        recipients={[
          makeRecipient({ id: 'r1', name: 'Alice', email: 'alice@test.com' }),
          makeRecipient({ id: 'r2', name: 'Bob', email: 'bob@test.com' }),
          makeRecipient({ id: 'r3', name: 'Charlie', email: 'charlie@test.com' }),
        ]}
      />,
    )
    expect(screen.getByText('Alice')).toBeDefined()
    expect(screen.getByText('Bob')).toBeDefined()
    expect(screen.getByText('Charlie')).toBeDefined()
  })

  it('shows "Copy URL" button for each recipient', () => {
    render(
      <RecipientTable
        documentId="doc-1"
        recipients={[
          makeRecipient({ id: 'r1', name: 'Alice' }),
          makeRecipient({ id: 'r2', name: 'Bob' }),
        ]}
      />,
    )
    const copyButtons = screen.getAllByText('Copy URL')
    expect(copyButtons).toHaveLength(2)
  })

  it('shows formatted signedAt date when available', () => {
    render(
      <RecipientTable
        documentId="doc-1"
        recipients={[
          makeRecipient({ signedAt: '2026-02-15T14:30:00Z' }),
        ]}
      />,
    )
    // The formatted date should be present (locale-dependent, just check it's not "-")
    const cells = screen.queryAllByText('-')
    expect(cells).toHaveLength(0) // no dash since signedAt is provided
  })

  it('shows dash when signedAt is not available', () => {
    render(
      <RecipientTable
        documentId="doc-1"
        recipients={[makeRecipient({ signedAt: undefined })]}
      />,
    )
    expect(screen.getByText('-')).toBeDefined()
  })
})
