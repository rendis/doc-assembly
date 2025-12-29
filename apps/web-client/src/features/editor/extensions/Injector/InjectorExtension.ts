// @ts-ignore
import { mergeAttributes, Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { InjectorComponent } from './InjectorComponent';

export type InjectorType = 'TEXT' | 'NUMBER' | 'DATE' | 'CURRENCY' | 'BOOLEAN' | 'IMAGE' | 'TABLE';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    setInjector: (options: { type: InjectorType; label: string; variableId?: string }) => ReturnType;
  }
}

export const InjectorExtension = Node.create({
  name: 'injector',

  group: 'inline',

  inline: true,

  atom: true,

  addAttributes() {
    return {
      type: {
        default: 'TEXT',
      },
      label: {
        default: 'Variable',
      },
      variableId: {
        default: null,
      },
      format: {
        default: null,
      },
      required: {
        default: false,
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="injector"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, any> }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'injector' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(InjectorComponent);
  },

  addCommands() {
    return {
      setInjector:
        (options: { type: InjectorType; label: string; variableId?: string }) =>
        ({ commands }: { commands: any }) => {
          return commands.insertContent({
            type: this.name,
            attrs: options,
          });
        },
    };
  },
});
