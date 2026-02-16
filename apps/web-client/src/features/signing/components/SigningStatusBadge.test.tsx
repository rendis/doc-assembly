import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SigningStatusBadge } from './SigningStatusBadge'
import { SigningDocumentStatus } from '../types'

describe('SigningStatusBadge', () => {
  const statusLabelMap: Record<string, string> = {
    DRAFT: 'Draft',
    PENDING_PROVIDER: 'Processing',
    PENDING: 'Pending',
    IN_PROGRESS: 'In Progress',
    COMPLETED: 'Completed',
    DECLINED: 'Declined',
    VOIDED: 'Voided',
    EXPIRED: 'Expired',
    ERROR: 'Error',
  }

  for (const [status, label] of Object.entries(statusLabelMap)) {
    it(`renders "${label}" for status ${status}`, () => {
      render(
        <SigningStatusBadge
          status={status as SigningDocumentStatus}
        />,
      )
      expect(screen.getByText(label)).toBeDefined()
    })
  }

  it('falls back to raw status string for unknown status', () => {
    render(
      <SigningStatusBadge
        status={'UNKNOWN_STATUS' as SigningDocumentStatus}
      />,
    )
    expect(screen.getByText('UNKNOWN_STATUS')).toBeDefined()
  })

  it('applies additional className when provided', () => {
    render(
      <SigningStatusBadge
        status={SigningDocumentStatus.COMPLETED}
        className="extra-class"
      />,
    )
    const badge = screen.getByText('Completed')
    expect(badge.className).toContain('extra-class')
  })
})
