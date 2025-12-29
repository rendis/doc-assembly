// @ts-ignore
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

  draggable: true,

  selectable: false,

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

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'signature' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SignatureComponent);
  },

  addCommands() {
    return {
      setSignature:
        (options: { roleId: string; label?: string }) =>
        ({ commands }: { commands: any }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});
