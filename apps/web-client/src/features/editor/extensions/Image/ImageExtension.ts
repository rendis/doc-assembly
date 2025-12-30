// @ts-expect-error - tiptap types incompatible with moduleResolution: bundler
import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { ImageComponent } from './ImageComponent';
import type { ImageDisplayMode, ImageAlign, ImageShape } from './types';

export interface ImageOptions {
  inline: boolean;
  allowBase64: boolean;
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customImage: {
      setImage: (options: {
        src: string;
        alt?: string;
        title?: string;
        width?: number;
        height?: number;
        displayMode?: ImageDisplayMode;
        align?: ImageAlign;
        shape?: ImageShape;
      }) => ReturnType;
      setImageAlign: (options: {
        displayMode: ImageDisplayMode;
        align: ImageAlign;
      }) => ReturnType;
      setImageSize: (options: {
        width: number;
        height: number;
      }) => ReturnType;
      setImageShape: (shape: ImageShape) => ReturnType;
    };
  }
}

export const ImageExtension = Node.create<ImageOptions>({
  name: 'image',

  addOptions() {
    return {
      inline: false,
      allowBase64: true,
      HTMLAttributes: {},
    };
  },

  inline() {
    return this.options.inline;
  },

  group() {
    return this.options.inline ? 'inline' : 'block';
  },

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
        parseHTML: (element: HTMLElement) => {
          const width = element.getAttribute('width') || element.style.width;
          return width ? parseInt(width, 10) : null;
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.width) return {};
          return { width: attributes.width };
        },
      },
      height: {
        default: null,
        parseHTML: (element: HTMLElement) => {
          const height = element.getAttribute('height') || element.style.height;
          return height ? parseInt(height, 10) : null;
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          if (!attributes.height) return {};
          return { height: attributes.height };
        },
      },
      displayMode: {
        default: 'block',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-display-mode') || 'block',
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-display-mode': attributes.displayMode,
        }),
      },
      align: {
        default: 'center',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-align') || 'center',
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-align': attributes.align,
        }),
      },
      shape: {
        default: 'square',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-shape') || 'square',
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-shape': attributes.shape,
        }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: this.options.allowBase64
          ? 'img[src]'
          : 'img[src]:not([src^="data:"])',
      },
    ];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, unknown> }) {
    return ['img', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageComponent);
  },

  addCommands() {
    return {
      setImage:
        (options: { src: string; alt?: string; title?: string; width?: number; height?: number; displayMode?: ImageDisplayMode; align?: ImageAlign; shape?: ImageShape }) =>
        ({ commands }: { commands: { insertContent: (content: Record<string, unknown>) => boolean } }) => {
          return commands.insertContent({
            type: this.name,
            attrs: {
              ...options,
              displayMode: options.displayMode || 'block',
              align: options.align || 'center',
              shape: options.shape || 'square',
            },
          });
        },
      setImageAlign:
        (options: { displayMode: ImageDisplayMode; align: ImageAlign }) =>
        ({ commands }: { commands: { updateAttributes: (name: string, attrs: Record<string, unknown>) => boolean } }) => {
          return commands.updateAttributes(this.name, {
            displayMode: options.displayMode,
            align: options.align,
          });
        },
      setImageSize:
        (options: { width: number; height: number }) =>
        ({ commands }: { commands: { updateAttributes: (name: string, attrs: Record<string, unknown>) => boolean } }) => {
          return commands.updateAttributes(this.name, {
            width: options.width,
            height: options.height,
          });
        },
      setImageShape:
        (shape: ImageShape) =>
        ({ commands }: { commands: { updateAttributes: (name: string, attrs: Record<string, unknown>) => boolean } }) => {
          return commands.updateAttributes(this.name, { shape });
        },
    };
  },
});
