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
}

export interface ImageAlignOption {
  displayMode: ImageDisplayMode;
  align: ImageAlign;
  label: string;
  description: string;
}

export const IMAGE_ALIGN_OPTIONS: ImageAlignOption[] = [
  // Block modes (occupy full line)
  {
    displayMode: 'block',
    align: 'left',
    label: 'Bloque izquierda',
    description: 'Ocupa toda la linea, alineada a la izquierda',
  },
  {
    displayMode: 'block',
    align: 'center',
    label: 'Bloque centro',
    description: 'Ocupa toda la linea, centrada',
  },
  {
    displayMode: 'block',
    align: 'right',
    label: 'Bloque derecha',
    description: 'Ocupa toda la linea, alineada a la derecha',
  },
  // Inline/float modes (text wraps around)
  {
    displayMode: 'inline',
    align: 'left',
    label: 'Flotante izquierda',
    description: 'Texto rodea la imagen por la derecha',
  },
  {
    displayMode: 'inline',
    align: 'right',
    label: 'Flotante derecha',
    description: 'Texto rodea la imagen por la izquierda',
  },
];

export const DEFAULT_IMAGE_ATTRS: Partial<ImageAttributes> = {
  displayMode: 'block',
  align: 'center',
  width: undefined,
  height: undefined,
};
