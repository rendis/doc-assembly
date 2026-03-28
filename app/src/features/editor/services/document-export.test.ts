import { afterEach, describe, expect, it } from 'vitest'
import type { Editor } from '@tiptap/core'
import { exportDocument } from './document-export'
import { useDocumentHeaderStore } from '../stores/document-header-store'

describe('exportDocument', () => {
  afterEach(() => {
    useDocumentHeaderStore.getState().reset()
  })

  it('derives header enabled from meaningful content or image data', () => {
    useDocumentHeaderStore.getState().configure({
      enabled: false,
      layout: 'image-right',
      imageUrl: 'https://example.com/logo.png',
      imageAlt: 'Company logo',
      imageWidth: 180,
      imageHeight: 72,
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
            attrs: { lineSpacing: 'relaxed' },
            content: [{ type: 'text', text: 'Body content' }],
          },
        ],
      }),
    } as unknown as Editor

    const exported = exportDocument(
      editor,
      {
        pagination: {
          pageSize: { width: 794, height: 1123, label: 'A4' },
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

    expect(exported.pageConfig).not.toHaveProperty('lineSpacing')
    expect(exported.content.content[0]?.attrs).toEqual({ lineSpacing: 'relaxed' })
    expect(exported.header).toEqual({
      enabled: true,
      layout: 'image-right',
      imageUrl: 'https://example.com/logo.png',
      imageAlt: 'Company logo',
      imageInjectableId: null,
      imageInjectableLabel: null,
      imageWidth: 180,
      imageHeight: 72,
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

  it('exports an empty header placeholder as disabled', () => {
    useDocumentHeaderStore.getState().configure({
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
    })

    const editor = {
      getJSON: () => ({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            attrs: { lineSpacing: 'tight' },
            content: [{ type: 'text', text: 'Body content' }],
          },
        ],
      }),
    } as unknown as Editor

    const exported = exportDocument(
      editor,
      {
        pagination: {
          pageSize: { width: 794, height: 1123, label: 'A4' },
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
        title: 'Empty header placeholder',
        language: 'es',
      }
    )

    expect(exported.pageConfig).not.toHaveProperty('lineSpacing')
    expect(exported.content.content[0]?.attrs).toEqual({ lineSpacing: 'tight' })
    expect(exported.header).toEqual({
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

  it('tracks image injectables used only in body and header', () => {
    useDocumentHeaderStore.getState().configure({
      enabled: true,
      layout: 'image-left',
      imageUrl: 'data:image/svg+xml;base64,placeholder',
      imageAlt: 'Company logo',
      imageInjectableId: 'header_logo',
      imageInjectableLabel: 'Logo Header',
      imageWidth: 180,
      imageHeight: 72,
      content: null,
    })

    const editor = {
      getJSON: () => ({
        type: 'doc',
        content: [
          {
            type: 'customImage',
            attrs: {
              src: 'data:image/svg+xml;base64,placeholder',
              injectableId: 'body_logo',
              injectableLabel: 'Logo Body',
              width: 240,
              height: 120,
            },
          },
        ],
      }),
    } as unknown as Editor

    const exported = exportDocument(
      editor,
      {
        pagination: {
          pageSize: { width: 794, height: 1123, label: 'A4' },
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
        title: 'Image injectables',
        language: 'es',
      }
    )

    expect(exported.variableIds).toEqual(['body_logo', 'header_logo'])
    expect(exported.header).toMatchObject({
      imageInjectableId: 'header_logo',
      imageInjectableLabel: 'Logo Header',
    })
  })
})
