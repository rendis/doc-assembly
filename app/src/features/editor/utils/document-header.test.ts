import { describe, expect, it } from 'vitest'
import {
  deriveHeaderEnabled,
  hasMeaningfulHeaderContent,
  normalizeHeaderContent,
} from './document-header'

describe('document-header helpers', () => {
  it('treats plain placeholder paragraphs as empty header content', () => {
    expect(
      hasMeaningfulHeaderContent({
        type: 'doc',
        content: [{ type: 'paragraph' }],
      })
    ).toBe(false)
  })

  it('treats text nodes as meaningful header content', () => {
    expect(
      hasMeaningfulHeaderContent({
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Company HQ' }],
          },
        ],
      })
    ).toBe(true)
  })

  it('derives enabled from either text content or image', () => {
    expect(
      deriveHeaderEnabled({
        content: {
          type: 'doc',
          content: [{ type: 'paragraph' }],
        },
        imageUrl: null,
      })
    ).toBe(false)

    expect(
      deriveHeaderEnabled({
        content: {
          type: 'doc',
          content: [{ type: 'paragraph' }],
        },
        imageUrl: 'data:image/png;base64,abc123',
      })
    ).toBe(true)
  })

  it('normalizes consecutive header paragraphs into hard breaks', () => {
    const normalized = normalizeHeaderContent({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Line 1' }],
        },
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Line 2' }],
        },
      ],
    })

    expect(normalized?.content).toHaveLength(1)
    expect(normalized?.content?.[0]).toMatchObject({
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Line 1' },
        { type: 'hardBreak' },
        { type: 'text', text: 'Line 2' },
      ],
    })
  })

  it('keeps header paragraphs separate when attrs differ', () => {
    const normalized = normalizeHeaderContent({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          attrs: { lineSpacing: 'compact' },
          content: [{ type: 'text', text: 'Line 1' }],
        },
        {
          type: 'paragraph',
          attrs: { lineSpacing: 'loose' },
          content: [{ type: 'text', text: 'Line 2' }],
        },
      ],
    })

    expect(normalized?.content).toHaveLength(2)
  })
})
