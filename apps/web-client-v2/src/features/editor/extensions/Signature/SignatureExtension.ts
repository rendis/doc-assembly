import { mergeAttributes, Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import { SignatureComponent } from './SignatureComponent'
import type {
  SignatureBlockAttrs,
  SignatureCount,
  SignatureLayout,
  SignatureLineWidth,
} from './types'
import { createDefaultSignatureAttrs, createEmptySignatureItem } from './types'

export interface SetSignatureOptions {
  count?: SignatureCount
  layout?: SignatureLayout
  lineWidth?: SignatureLineWidth
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    signature: {
      setSignature: (options?: SetSignatureOptions) => ReturnType
    }
  }
}

export const SignatureExtension = Node.create({
  name: 'signature',

  group: 'block',

  atom: true,

  allowGapCursor: false,

  addAttributes() {
    return {
      count: {
        default: 1,
      },
      layout: {
        default: 'single-center',
      },
      lineWidth: {
        default: 'md',
      },
      signatures: {
        default: [createEmptySignatureItem(0)],
        parseHTML: (element: HTMLElement) => {
          const signaturesAttr = element.getAttribute('data-signatures')
          if (signaturesAttr) {
            try {
              return JSON.parse(signaturesAttr)
            } catch {
              return [createEmptySignatureItem(0)]
            }
          }
          // Retrocompatibilidad con formato antiguo
          const roleId = element.getAttribute('data-role-id')
          const label = element.getAttribute('data-label') || 'Firma'
          if (roleId) {
            return [
              {
                id: `legacy_${Date.now()}`,
                roleId,
                label,
              },
            ]
          }
          return [createEmptySignatureItem(0)]
        },
        renderHTML: (attributes: {
          signatures: SignatureBlockAttrs['signatures']
        }) => {
          return {
            'data-signatures': JSON.stringify(attributes.signatures),
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="signature"]',
        getAttrs: (element: HTMLElement) => {
          // Detectar formato legacy
          const roleId = element.getAttribute('data-role-id')
          if (roleId && !element.getAttribute('data-signatures')) {
            const label = element.getAttribute('data-label') || 'Firma'
            return {
              count: 1,
              layout: 'single-center',
              lineWidth: 'md',
              signatures: [
                {
                  id: `legacy_${Date.now()}`,
                  roleId,
                  label,
                },
              ],
            }
          }
          return {}
        },
      },
    ]
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, { 'data-type': 'signature' }),
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(SignatureComponent)
  },

  addCommands() {
    return {
      setSignature:
        (options?: SetSignatureOptions) =>
        ({
          commands,
        }: {
          commands: { insertContent: (content: unknown) => boolean }
        }) => {
          const defaultAttrs = createDefaultSignatureAttrs()
          const attrs: SignatureBlockAttrs = {
            ...defaultAttrs,
            ...options,
          }

          // Asegurar que el array de signatures coincida con count
          if (attrs.signatures.length !== attrs.count) {
            const newSignatures = []
            for (let i = 0; i < attrs.count; i++) {
              newSignatures.push(
                attrs.signatures[i] || createEmptySignatureItem(i)
              )
            }
            attrs.signatures = newSignatures
          }

          return commands.insertContent({
            type: this.name,
            attrs,
          })
        },
    }
  },
})
