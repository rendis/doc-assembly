import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { InlineImageComponent } from './InlineImageComponent';
import type { InlineImageFloat, ImageShape } from '../types';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    inlineImage: {
      setInlineImage: (options: {
        src: string;
        alt?: string;
        title?: string;
        width?: number;
        height?: number;
        float?: InlineImageFloat;
        shape?: ImageShape;
      }) => ReturnType;
      setInlineImageFloat: (float: InlineImageFloat) => ReturnType;
      setInlineImageSize: (options: { width: number; height: number }) => ReturnType;
      setInlineImageShape: (shape: ImageShape) => ReturnType;
      convertInlineToBlock: () => ReturnType;
    };
  }
}

export const InlineImageExtension = Node.create({
  name: 'inlineImage',

  // Inline node - text wraps around within the same paragraph
  group: 'inline',

  inline: true,

  atom: true,

  draggable: true,

  addAttributes() {
    return {
      src: {
        default: null,
      },
      alt: {
        default: null,
      },
      title: {
        default: null,
      },
      width: {
        default: null,
      },
      height: {
        default: null,
      },
      float: {
        default: 'left',
        parseHTML: (element) => element.getAttribute('data-float') || 'left',
        renderHTML: (attributes) => ({
          'data-float': attributes.float,
        }),
      },
      shape: {
        default: 'square',
        parseHTML: (element) => element.getAttribute('data-shape') || 'square',
        renderHTML: (attributes) => ({
          'data-shape': attributes.shape,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="inline-image"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, { 'data-type': 'inline-image' }),
      ['img', { src: HTMLAttributes.src, alt: HTMLAttributes.alt, title: HTMLAttributes.title }],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(InlineImageComponent);
  },

  addCommands() {
    return {
      setInlineImage:
        (options) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              src: options.src,
              alt: options.alt,
              title: options.title,
              width: options.width,
              height: options.height,
              float: options.float || 'left',
              shape: options.shape || 'square',
            },
          });
        },

      setInlineImageFloat:
        (float) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { float });
        },

      setInlineImageSize:
        (options) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, {
            width: options.width,
            height: options.height,
          });
        },

      setInlineImageShape:
        (shape) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { shape });
        },

      convertInlineToBlock:
        () =>
        ({ state, chain }) => {
          const { selection } = state;
          const node = state.doc.nodeAt(selection.from);

          if (!node || node.type.name !== this.name) {
            return false;
          }

          const { src, alt, title, width, height, shape } = node.attrs;

          return chain()
            .deleteSelection()
            .insertContent({
              type: 'blockImage',
              attrs: {
                src,
                alt,
                title,
                width,
                height,
                shape,
                align: 'center', // Default align when converting from inline
              },
            })
            .run();
        },
    };
  },
});
