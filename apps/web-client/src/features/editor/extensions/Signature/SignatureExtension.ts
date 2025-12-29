// @ts-expect-error - TipTap types are not fully compatible with strict mode
import { mergeAttributes, Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { SignatureComponent } from './SignatureComponent';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    setSignature: (options: { roleId: string; label?: string }) => ReturnType;
  }
}

export const SignatureExtension = Node.create({
  name: 'signature',

  group: 'block',

  atom: true,

  allowGapCursor: false,

  addAttributes() {
    return {
      roleId: {
        default: null,
      },
      label: {
        default: 'Firma',
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="signature"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'signature' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SignatureComponent);
  },

  addCommands() {
    return {
      setSignature:
        (options: { roleId: string; label?: string }) =>
        ({ commands }: { commands: { insertContent: (content: unknown) => boolean } }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});
