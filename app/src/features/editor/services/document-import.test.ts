import { describe, expect, it, vi } from 'vitest'
import type { Editor } from '@tiptap/core'
import type { PortableDocument } from '../types/document-format'
import { importDocument } from './document-import'

function createBaseDocument(overrides: Partial<PortableDocument> = {}): PortableDocument {
  return {
    version: '1.1.0',
    meta: {
      title: 'Test Document',
      language: 'es',
    },
    pageConfig: {
      formatId: 'A4',
      width: 794,
      height: 1123,
      margins: {
        top: 72,
        bottom: 72,
        left: 72,
        right: 72,
      },
    },
    variableIds: ['client_name'],
    signerRoles: [
      {
        id: 'role-1',
        label: 'Signer',
        name: { type: 'text', value: '' },
        email: { type: 'text', value: '' },
        order: 1,
      },
    ],
    signingWorkflow: {
      orderMode: 'parallel',
      notifications: {
        scope: 'global',
        globalTriggers: {},
        roleConfigs: [],
      },
    },
    content: {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Hello world' }],
        },
      ],
    },
    exportInfo: {
      exportedAt: new Date().toISOString(),
      sourceApp: 'test-suite',
    },
    ...overrides,
  }
}

describe('importDocument', () => {
  it('loads editor content before restoring page/workflow stores', () => {
    const callOrder: string[] = []

    const editor = {
      commands: {
        setContent: vi.fn(() => {
          callOrder.push('content')
        }),
      },
    } as unknown as Editor

    const storeActions = {
      setPaginationConfig: vi.fn(() => {
        callOrder.push('page')
      }),
      setSignerRoles: vi.fn(() => {
        callOrder.push('roles')
      }),
      setWorkflowConfig: vi.fn(() => {
        callOrder.push('workflow')
      }),
    }

    const result = importDocument(createBaseDocument(), editor, storeActions, [])

    expect(result.success).toBe(true)
    expect(callOrder).toEqual(['content', 'page', 'roles', 'workflow'])
    expect(editor.commands.setContent).toHaveBeenCalledTimes(1)
    expect(storeActions.setPaginationConfig).toHaveBeenCalledTimes(1)
    expect(storeActions.setSignerRoles).toHaveBeenCalledTimes(1)
    expect(storeActions.setWorkflowConfig).toHaveBeenCalledTimes(1)
  })

  it('returns orphaned variables when backend definitions are missing', () => {
    const editor = {
      commands: {
        setContent: vi.fn(),
      },
    } as unknown as Editor

    const storeActions = {
      setPaginationConfig: vi.fn(),
      setSignerRoles: vi.fn(),
      setWorkflowConfig: vi.fn(),
    }

    const result = importDocument(
      createBaseDocument({ variableIds: ['missing_variable'] }),
      editor,
      storeActions,
      []
    )

    expect(result.success).toBe(true)
    expect(result.orphanedVariables).toEqual(['missing_variable'])
  })

  it('fails validation for unsupported future document versions', () => {
    const editor = {
      commands: {
        setContent: vi.fn(),
      },
    } as unknown as Editor

    const storeActions = {
      setPaginationConfig: vi.fn(),
      setSignerRoles: vi.fn(),
      setWorkflowConfig: vi.fn(),
    }

    const result = importDocument(
      createBaseDocument({ version: '2.0.0' }),
      editor,
      storeActions,
      []
    )

    expect(result.success).toBe(false)
    expect(result.validation.errors[0]?.code).toBe('VERSION_TOO_NEW')
    expect(editor.commands.setContent).not.toHaveBeenCalled()
  })
})
