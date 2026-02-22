import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SignerRolesPanel } from './SignerRolesPanel'
import { useSignerRolesStore } from '../stores/signer-roles-store'

vi.mock('react-i18next', () => ({
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

describe('SignerRolesPanel collapsed header', () => {
  beforeEach(() => {
    useSignerRolesStore.getState().reset()
    useSignerRolesStore.getState().setRoles([
      {
        id: 'role-1',
        label: 'Signer 1',
        name: { type: 'text', value: '' },
        email: { type: 'text', value: '' },
        order: 1,
      },
    ])
    useSignerRolesStore.getState().toggleCollapsed()
  })

  it('uses toolbar-aligned vertical rhythm and renders full-surface expand control when collapsed', () => {
    const { container } = render(
      <TooltipProvider>
        <SignerRolesPanel variables={[]} />
      </TooltipProvider>
    )

    const header = container.querySelector('aside > div')
    expect(header).toBeDefined()
    expect(header?.className).toContain('pt-3')
    expect(header?.className).toContain('pb-2')
    expect(header?.className).not.toContain('h-14')

    const collapsedBadge = container.querySelector('span.rounded-full')
    expect(collapsedBadge).toBeNull()

    const expandButton = screen.getByRole('button', {
      name: 'editor.roles.panel.collapse.expand',
    })
    expect(expandButton.className).toContain('absolute')
    expect(expandButton.className).toContain('inset-0')
    expect(expandButton.className).toContain('flex')
    expect(expandButton.className).toContain('items-center')
    expect(expandButton.className).toContain('justify-center')
  })
})
