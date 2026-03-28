import { afterEach, describe, expect, it } from 'vitest'
import type { Editor } from '@tiptap/core'
import { exportDocument } from './document-export'
import { useDocumentHeaderStore } from '../stores/document-header-store'

describe('exportDocument', () => {
  afterEach(() => {
    useDocumentHeaderStore.getState().reset()
  })

  it('includes header configuration in the exported portable document', () => {
    useDocumentHeaderStore.getState().configure({
      enabled: true,
      layout: 'image-right',
      imageUrl: 'https://example.com/logo.png',
      imageAlt: 'Company logo',
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Header copy' }],
          },
        ],
      },
    })

    const editor = {
      getJSON: () => ({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Body content' }],
          },
        ],
      }),
    } as unknown as Editor

    const exported = exportDocument(
      editor,
      {
        pagination: {
          pageSize: { width: 794, height: 1123, id: 'A4', label: 'A4', margins: { top: 72, right: 72, bottom: 72, left: 72 } },
          margins: { top: 72, right: 72, bottom: 72, left: 72 },
        },
        signerRoles: [],
        workflowConfig: {
          orderMode: 'parallel',
          notifications: {
            scope: 'global',
            globalTriggers: {},
            roleConfigs: [],
          },
        },
      },
      {
        title: 'Header test',
        language: 'es',
      }
    )

    expect(exported.header).toEqual({
      enabled: true,
      layout: 'image-right',
      imageUrl: 'https://example.com/logo.png',
      imageAlt: 'Company logo',
      content: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Header copy' }],
          },
        ],
      },
    })
  })
})
