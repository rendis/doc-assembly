import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { SigningStatusBadge } from './SigningStatusBadge'
import { SigningDocumentStatus } from '../types'

describe('SigningStatusBadge', () => {
  const statusLabelMap: Record<string, string> = {
    DRAFT: 'Draft',
    PREPARING_SIGNATURE: 'Processing',
    READY_TO_SIGN: 'Ready to Sign',
    SIGNING: 'Signing',
    COMPLETED: 'Completed',
    DECLINED: 'Declined',
    CANCELLED: 'Cancelled',
    INVALIDATED: 'Invalidated',
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
