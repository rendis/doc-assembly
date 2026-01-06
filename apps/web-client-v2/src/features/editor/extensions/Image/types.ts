// Image types - separated for block and inline images
export type ImageType = 'block' | 'inline';
export type ImageShape = 'square' | 'circle';

// Block image alignment (for block-level images)
export type BlockImageAlign = 'left' | 'center' | 'right';

// Inline image float direction (for text-wrapping images)
export type InlineImageFloat = 'left' | 'right';

// Block image attributes
export interface BlockImageAttributes {
  src: string;
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
  align: BlockImageAlign;
  shape: ImageShape;
}

// Inline image attributes
export interface InlineImageAttributes {
  src: string;
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
  float: InlineImageFloat;
  shape: ImageShape;
}

// Align options for block images
export interface BlockImageAlignOption {
  align: BlockImageAlign;
  label: string;
  icon: 'block-left' | 'block-center' | 'block-right';
}

// Float options for inline images
export interface InlineImageFloatOption {
  float: InlineImageFloat;
  label: string;
  icon: 'inline-left' | 'inline-right';
}

export const BLOCK_IMAGE_ALIGN_OPTIONS: BlockImageAlignOption[] = [
  { align: 'left', label: 'Izquierda', icon: 'block-left' },
  { align: 'center', label: 'Centro', icon: 'block-center' },
  { align: 'right', label: 'Derecha', icon: 'block-right' },
];

export const INLINE_IMAGE_FLOAT_OPTIONS: InlineImageFloatOption[] = [
  { float: 'left', label: 'Flotante izquierda', icon: 'inline-left' },
  { float: 'right', label: 'Flotante derecha', icon: 'inline-right' },
];

export const DEFAULT_BLOCK_IMAGE_ATTRS: Omit<BlockImageAttributes, 'src'> = {
  align: 'center',
  shape: 'square',
  width: undefined,
  height: undefined,
  alt: undefined,
  title: undefined,
};

export const DEFAULT_INLINE_IMAGE_ATTRS: Omit<InlineImageAttributes, 'src'> = {
  float: 'left',
  shape: 'square',
  width: undefined,
  height: undefined,
  alt: undefined,
  title: undefined,
};

// Legacy types for backwards compatibility during migration
export type ImageDisplayMode = 'block' | 'inline';
export type ImageAlign = 'left' | 'center' | 'right';

export interface ImageAttributes {
  src: string;
  alt?: string;
  title?: string;
  width?: number;
  height?: number;
  displayMode: ImageDisplayMode;
  align: ImageAlign;
  shape: ImageShape;
}

export interface ImageAlignOption {
  displayMode: ImageDisplayMode;
  align: ImageAlign;
  label: string;
  icon: 'block-left' | 'block-center' | 'block-right' | 'inline-left' | 'inline-right';
}

export const IMAGE_ALIGN_OPTIONS: ImageAlignOption[] = [
  { displayMode: 'block', align: 'left', label: 'Bloque izquierda', icon: 'block-left' },
  { displayMode: 'block', align: 'center', label: 'Bloque centro', icon: 'block-center' },
  { displayMode: 'block', align: 'right', label: 'Bloque derecha', icon: 'block-right' },
  { displayMode: 'inline', align: 'left', label: 'Flotante izquierda', icon: 'inline-left' },
  { displayMode: 'inline', align: 'right', label: 'Flotante derecha', icon: 'inline-right' },
];

export const DEFAULT_IMAGE_ATTRS: Omit<ImageAttributes, 'src'> = {
  displayMode: 'block',
  align: 'center',
  shape: 'square',
  width: undefined,
  height: undefined,
  alt: undefined,
  title: undefined,
};
