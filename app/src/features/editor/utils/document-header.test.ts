import { describe, expect, it } from 'vitest'
import {
  deriveHeaderEnabled,
  hasMeaningfulHeaderContent,
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
})
