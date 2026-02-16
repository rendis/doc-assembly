import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'
import { SigningListToolbar } from './SigningListToolbar'

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (_key: string, fallback: string) => fallback,
  }),
}))

describe('SigningListToolbar', () => {
  const defaultProps = {
    searchQuery: '',
    onSearchChange: vi.fn(),
    selectedStatuses: [] as string[],
    onStatusesChange: vi.fn(),
  }

  it('renders search input with placeholder', () => {
    render(<SigningListToolbar {...defaultProps} />)
    expect(
      screen.getByPlaceholderText('Search documents by title...'),
    ).toBeDefined()
  })

  it('displays current search query value', () => {
    render(<SigningListToolbar {...defaultProps} searchQuery="test query" />)
    const input = screen.getByPlaceholderText(
      'Search documents by title...',
    ) as HTMLInputElement
    expect(input.value).toBe('test query')
  })

  it('fires onSearchChange when typing in search input', async () => {
    const onSearchChange = vi.fn()
    render(
      <SigningListToolbar {...defaultProps} onSearchChange={onSearchChange} />,
    )

    const input = screen.getByPlaceholderText('Search documents by title...')
    await userEvent.type(input, 'hello')

    // Called once per character; each call receives the single char typed
    // because the component is controlled and searchQuery prop doesn't change
    expect(onSearchChange).toHaveBeenCalledTimes(5)
    expect(onSearchChange).toHaveBeenNthCalledWith(1, 'h')
    expect(onSearchChange).toHaveBeenNthCalledWith(5, 'o')
  })

  it('shows "Any" when no statuses are selected', () => {
    render(<SigningListToolbar {...defaultProps} />)
    expect(screen.getByText(/Status.*Any/)).toBeDefined()
  })

  it('shows count when statuses are selected', () => {
    render(
      <SigningListToolbar
        {...defaultProps}
        selectedStatuses={['PENDING', 'COMPLETED']}
      />,
    )
    expect(screen.getByText(/Status.*2/)).toBeDefined()
  })

  it('opens dropdown and shows status options when clicking status button', async () => {
    render(<SigningListToolbar {...defaultProps} />)

    const statusButton = screen.getByText(/Status.*Any/)
    await userEvent.click(statusButton)

    expect(screen.getByText('Draft')).toBeDefined()
    expect(screen.getByText('Pending')).toBeDefined()
    expect(screen.getByText('In Progress')).toBeDefined()
    expect(screen.getByText('Completed')).toBeDefined()
    expect(screen.getByText('Declined')).toBeDefined()
    expect(screen.getByText('Voided')).toBeDefined()
    expect(screen.getByText('Expired')).toBeDefined()
    expect(screen.getByText('Error')).toBeDefined()
  })

  it('calls onStatusesChange with added status when clicking a status option', async () => {
    const onStatusesChange = vi.fn()
    render(
      <SigningListToolbar
        {...defaultProps}
        onStatusesChange={onStatusesChange}
      />,
    )

    // Open dropdown
    await userEvent.click(screen.getByText(/Status.*Any/))
    // Click "Completed"
    await userEvent.click(screen.getByText('Completed'))

    expect(onStatusesChange).toHaveBeenCalledWith(['COMPLETED'])
  })

  it('calls onStatusesChange removing status when clicking an already-selected status', async () => {
    const onStatusesChange = vi.fn()
    render(
      <SigningListToolbar
        {...defaultProps}
        selectedStatuses={['PENDING', 'COMPLETED']}
        onStatusesChange={onStatusesChange}
      />,
    )

    // Open dropdown
    await userEvent.click(screen.getByText(/Status.*2/))
    // Click "COMPLETED" to deselect
    await userEvent.click(screen.getByText('Completed'))

    expect(onStatusesChange).toHaveBeenCalledWith(['PENDING'])
  })

  it('clears all statuses when clicking "Clear all"', async () => {
    const onStatusesChange = vi.fn()
    render(
      <SigningListToolbar
        {...defaultProps}
        selectedStatuses={['PENDING', 'COMPLETED']}
        onStatusesChange={onStatusesChange}
      />,
    )

    // Open dropdown
    await userEvent.click(screen.getByText(/Status.*2/))
    // Click "Clear all"
    await userEvent.click(screen.getByText('Clear all'))

    expect(onStatusesChange).toHaveBeenCalledWith([])
  })
})
