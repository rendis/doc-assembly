import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { BlockImageComponent } from './BlockImageComponent';
import type { BlockImageAlign, ImageShape } from '../types';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blockImage: {
      setBlockImage: (options: {
        src: string;
        alt?: string;
        title?: string;
        width?: number;
        height?: number;
        align?: BlockImageAlign;
        shape?: ImageShape;
      }) => ReturnType;
      setBlockImageAlign: (align: BlockImageAlign) => ReturnType;
      setBlockImageSize: (options: { width: number; height: number }) => ReturnType;
      setBlockImageShape: (shape: ImageShape) => ReturnType;
      convertBlockToInline: () => ReturnType;
    };
  }
}

export const BlockImageExtension = Node.create({
  name: 'blockImage',

  group: 'block',

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
      align: {
        default: 'center',
        parseHTML: (element) => element.getAttribute('data-align') || 'center',
        renderHTML: (attributes) => ({
          'data-align': attributes.align,
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
        tag: 'figure[data-type="block-image"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'figure',
      mergeAttributes(HTMLAttributes, { 'data-type': 'block-image' }),
      ['img', { src: HTMLAttributes.src, alt: HTMLAttributes.alt, title: HTMLAttributes.title }],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(BlockImageComponent);
  },

  addCommands() {
    return {
      setBlockImage:
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
              align: options.align || 'center',
              shape: options.shape || 'square',
            },
          });
        },

      setBlockImageAlign:
        (align) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { align });
        },

      setBlockImageSize:
        (options) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, {
            width: options.width,
            height: options.height,
          });
        },

      setBlockImageShape:
        (shape) =>
        ({ commands }) => {
          return commands.updateAttributes(this.name, { shape });
        },

      convertBlockToInline:
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
              type: 'inlineImage',
              attrs: {
                src,
                alt,
                title,
                width,
                height,
                shape,
                float: 'left', // Default float when converting from block
              },
            })
            .run();
        },
    };
  },
});
