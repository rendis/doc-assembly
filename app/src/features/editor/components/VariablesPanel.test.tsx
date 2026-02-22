import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { VariablesPanel } from './VariablesPanel'
import { useVariablesPanelStore } from '../stores/variables-panel-store'
import { useInjectablesStore } from '../stores/injectables-store'

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('../hooks/useRoleInjectables', () => ({
  useRoleInjectables: () => ({
    roleInjectables: [],
  }),
}))

describe('VariablesPanel collapsed header', () => {
  beforeEach(() => {
    useVariablesPanelStore.getState().reset()
    useInjectablesStore.getState().reset()

    useVariablesPanelStore.getState().setCollapsed(true)
    useInjectablesStore.getState().setVariables([
      {
        id: 'v-1',
        variableId: 'student_name',
        label: 'Student Name',
        type: 'TEXT',
        sourceType: 'INTERNAL',
      },
    ])
  })

  it('uses toolbar-aligned vertical rhythm in header and keeps counter badge visible', () => {
    const { container } = render(<VariablesPanel />)

    const header = container.querySelector('aside > div')
    expect(header).toBeDefined()
    expect(header?.className).toContain('pt-3')
    expect(header?.className).toContain('pb-2')
    expect(header?.className).not.toContain('h-14')

    const collapsedBadge = container.querySelector('span.rounded-full')
    expect(collapsedBadge).toBeDefined()
    expect(collapsedBadge?.textContent).toBe('1')
  })

  it('adds right-side spacing to collapsed chevron button', () => {
    render(<VariablesPanel />)

    const collapseButton = screen.getByRole('button', {
      name: 'editor.variablesPanel.collapse.expand',
    })

    expect(collapseButton.className).toContain('mr-1')
    expect(collapseButton.className).not.toContain('ml-1')
  })
})
