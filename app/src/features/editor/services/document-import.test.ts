import { describe, expect, it, vi } from 'vitest'
import type { Editor } from '@tiptap/core'
import type { PortableDocument } from '../types/document-format'
import { importDocument } from './document-import'
import { DOCUMENT_FORMAT_VERSION } from '../types/document-format'
import { useDocumentHeaderStore } from '../stores/document-header-store'

function createBaseDocument(overrides: Partial<PortableDocument> = {}): PortableDocument {
  return {
    version: DOCUMENT_FORMAT_VERSION,
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
    expect(storeActions.setPaginationConfig).toHaveBeenCalledWith(expect.objectContaining({
      margins: {
        top: 72,
        bottom: 72,
        left: 72,
        right: 72,
      },
    }))
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

  it('restores header configuration from the imported document', () => {
    useDocumentHeaderStore.getState().reset()

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
      createBaseDocument({
        header: {
          enabled: true,
          layout: 'image-center',
          imageUrl: 'data:image/png;base64,abc123',
          imageAlt: 'Inline logo',
          imageInjectableId: 'company_logo',
          imageInjectableLabel: 'Company logo',
          imageWidth: 210,
          imageHeight: 84,
          content: {
            type: 'doc',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Header text' }],
              },
            ],
          },
        },
      }),
      editor,
      storeActions,
      []
    )

    expect(result.success).toBe(true)
    expect(useDocumentHeaderStore.getState()).toMatchObject({
      enabled: true,
      layout: 'image-center',
      imageUrl: 'data:image/png;base64,abc123',
      imageAlt: 'Inline logo',
      imageInjectableId: 'company_logo',
      imageInjectableLabel: 'Company logo',
      imageWidth: 210,
      imageHeight: 84,
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Header text' }],
          },
        ],
      },
    })
  })

  it('derives imported header enabled from actual content instead of stale toggle state', () => {
    useDocumentHeaderStore.getState().reset()

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
      createBaseDocument({
        header: {
          enabled: true,
          layout: 'image-left',
          imageUrl: null,
          imageAlt: '',
          imageWidth: null,
          imageHeight: null,
          content: {
            type: 'doc',
            content: [{ type: 'paragraph' }],
          },
        },
      }),
      editor,
      storeActions,
      []
    )

    expect(result.success).toBe(true)
    expect(useDocumentHeaderStore.getState()).toMatchObject({
      enabled: false,
      layout: 'image-left',
      imageUrl: null,
      imageAlt: '',
      imageInjectableId: null,
      imageInjectableLabel: null,
      imageWidth: null,
      imageHeight: null,
      content: {
        type: 'doc',
        content: [{ type: 'paragraph' }],
      },
    })
  })

  it('resets header configuration when the imported document has no header block', () => {
    useDocumentHeaderStore.getState().configure({
      enabled: true,
      layout: 'image-right',
      imageUrl: 'https://example.com/old-logo.png',
      imageAlt: 'Old logo',
      imageWidth: 150,
      imageHeight: 60,
      content: {
        type: 'doc',
        content: [{ type: 'paragraph' }],
      },
    })

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

    const result = importDocument(createBaseDocument(), editor, storeActions, [])

    expect(result.success).toBe(true)
    expect(useDocumentHeaderStore.getState()).toMatchObject({
      enabled: false,
      layout: 'image-left',
      imageUrl: null,
      imageAlt: '',
      imageInjectableId: null,
      imageInjectableLabel: null,
      imageWidth: null,
      imageHeight: null,
      content: null,
    })
  })

  it('clears stale header image bindings when importing a header without injector fields', () => {
    useDocumentHeaderStore.getState().configure({
      enabled: true,
      layout: 'image-right',
      imageUrl: 'data:image/svg+xml;base64,placeholder',
      imageAlt: 'Old logo',
      imageInjectableId: 'stale_logo',
      imageInjectableLabel: 'Stale logo',
      imageWidth: 150,
      imageHeight: 60,
      content: null,
    })

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
      createBaseDocument({
        version: '1.1.1',
        header: {
          enabled: true,
          layout: 'image-left',
          imageUrl: 'data:image/svg+xml;base64,new-placeholder',
          imageAlt: 'New logo',
          imageWidth: 200,
          imageHeight: 80,
        },
      }),
      editor,
      storeActions,
      []
    )

    expect(result.success).toBe(true)
    expect(useDocumentHeaderStore.getState()).toMatchObject({
      enabled: true,
      layout: 'image-left',
      imageUrl: 'data:image/svg+xml;base64,new-placeholder',
      imageAlt: 'New logo',
      imageInjectableId: null,
      imageInjectableLabel: null,
      imageWidth: 200,
      imageHeight: 80,
      content: null,
    })
  })

  it('migrates older documents to the current version without changing page config', () => {
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

    const legacyDocument = createBaseDocument({
      version: '1.1.0',
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
    })

    const result = importDocument(legacyDocument, editor, storeActions, [])

    expect(result.success).toBe(true)
    expect(result.document?.version).toBe(DOCUMENT_FORMAT_VERSION)
  })

  it('preserves paragraph line spacing attrs in imported content', () => {
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
      createBaseDocument({
        content: {
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              attrs: { lineSpacing: 'loose' },
              content: [{ type: 'text', text: 'Hello world' }],
            },
          ],
        },
      }),
      editor,
      storeActions,
      []
    )

    expect(result.success).toBe(true)
    expect(editor.commands.setContent).toHaveBeenCalledWith({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { lineSpacing: 'loose' },
          content: [{ type: 'text', text: 'Hello world' }],
        },
      ],
    })
  })
})
