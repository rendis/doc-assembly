import type { PageFormat } from '../types/pagination';

/**
 * Standard page formats with dimensions in pixels at 96 DPI
 * A4: 210mm x 297mm = 794 x 1123 px
 * Letter: 8.5" x 11" = 816 x 1056 px
 * Legal: 8.5" x 14" = 816 x 1344 px
 */
export const PAGE_FORMATS: Record<string, PageFormat> = {
  A4: {
    id: 'A4',
    name: 'A4',
    width: 794,
    height: 1123,
    margins: { top: 96, bottom: 96, left: 72, right: 72 },
  },
  LETTER: {
    id: 'LETTER',
    name: 'Letter',
    width: 816,
    height: 1056,
    margins: { top: 96, bottom: 96, left: 96, right: 96 },
  },
  LEGAL: {
    id: 'LEGAL',
    name: 'Legal',
    width: 816,
    height: 1344,
    margins: { top: 96, bottom: 96, left: 96, right: 96 },
  },
};

/**
 * Convert centimeters to pixels at 96 DPI
 */
export const cmToPixels = (cm: number): number => {
  return Math.round(cm * 37.7952755906);
};

/**
 * Convert millimeters to pixels at 96 DPI
 */
export const mmToPixels = (mm: number): number => {
  return Math.round(mm * 3.77952755906);
};

/**
 * Convert pixels to millimeters at 96 DPI
 */
export const pixelsToMm = (px: number): number => {
  return px / 3.77952755906;
};

/**
 * Convert inches to pixels at 96 DPI
 */
export const inchesToPixels = (inches: number): number => {
  return Math.round(inches * 96);
};

/**
 * Get the content area dimensions (page minus margins)
 */
export const getContentArea = (format: PageFormat) => ({
  width: format.width - format.margins.left - format.margins.right,
  height: format.height - format.margins.top - format.margins.bottom,
});

/**
 * Create a custom page format
 */
export const createCustomFormat = (
  width: number,
  height: number,
  margins: { top: number; bottom: number; left: number; right: number }
): PageFormat => ({
  id: 'CUSTOM',
  name: 'Personalizado',
  width,
  height,
  margins,
});

/**
 * Default page format
 */
export const DEFAULT_PAGE_FORMAT = PAGE_FORMATS.A4;
