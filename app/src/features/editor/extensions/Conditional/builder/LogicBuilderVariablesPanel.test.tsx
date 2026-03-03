import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { useInjectablesStore } from '../../../stores/injectables-store'
import { LogicBuilderVariablesPanel } from './LogicBuilderVariablesPanel'

vi.mock('react-i18next', () => ({
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

describe('LogicBuilderVariablesPanel overflow safeguards', () => {
  beforeEach(() => {
    useInjectablesStore.getState().reset()
    useInjectablesStore.getState().setVariables([
      {
        id: 'v-internal',
        variableId: 'current_date',
        label: 'Current Date',
        type: 'DATE',
        sourceType: 'INTERNAL',
      },
      {
        id: 'v-external',
        variableId: 'customer_name',
        label: 'Customer Name',
        type: 'TEXT',
        sourceType: 'EXTERNAL',
      },
    ])
  })

  it('keeps header actions and segmented filter constrained inside panel width', () => {
    render(<LogicBuilderVariablesPanel />)

    const panelTitle = screen.getByText('editor.variablesPanel.header')
    expect(panelTitle.className).toContain('truncate')

    const collapseAllButton = screen.getByRole('button', {
      name: 'editor.variablesPanel.expandAll',
    })
    expect(collapseAllButton.parentElement?.className).toContain('shrink-0')

    const internalFilterButton = screen.getByRole('button', { name: 'Internal' })
    const allFilterButton = screen.getByRole('button', { name: 'All' })
    const externalFilterButton = screen.getByRole('button', { name: 'External' })

    expect(internalFilterButton.className).toContain('basis-0')
    expect(internalFilterButton.className).toContain('min-w-0')
    expect(allFilterButton.className).toContain('basis-0')
    expect(allFilterButton.className).toContain('min-w-0')
    expect(externalFilterButton.className).toContain('basis-0')
    expect(externalFilterButton.className).toContain('min-w-0')

    const segmentedControl = internalFilterButton.parentElement
    expect(segmentedControl?.className).toContain('min-w-0')
    expect(segmentedControl?.className).toContain('w-full')
    expect(segmentedControl?.className).toContain('overflow-hidden')

    const externalSectionLabel = screen.getByText(
      'editor.variablesPanel.sections.externalVariables'
    )
    const internalSectionLabel = screen.getByText(
      'editor.variablesPanel.sections.internalVariables'
    )
    expect(externalSectionLabel.className).toContain('flex-1')
    expect(externalSectionLabel.className).toContain('truncate')
    expect(internalSectionLabel.className).toContain('flex-1')
    expect(internalSectionLabel.className).toContain('truncate')
  })
})
