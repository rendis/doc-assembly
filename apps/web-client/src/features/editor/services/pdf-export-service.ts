import type { PdfExportOptions } from '../types/preview';

/**
 * Page dimensions in mm for different formats
 */
const PAGE_DIMENSIONS = {
  a4: { width: 210, height: 297 },
  letter: { width: 215.9, height: 279.4 },
  legal: { width: 215.9, height: 355.6 },
} as const;

/**
 * Default PDF export options
 */
const DEFAULT_OPTIONS: Required<PdfExportOptions> = {
  filename: 'document.pdf',
  format: 'a4',
  orientation: 'portrait',
  margin: 10,
  scale: 2,
};

/**
 * Get margin configuration
 */
function getMarginConfig(
  margin: number | { top: number; right: number; bottom: number; left: number }
): { top: number; right: number; bottom: number; left: number } {
  if (typeof margin === 'number') {
    return { top: margin, right: margin, bottom: margin, left: margin };
  }
  return margin;
}

/**
 * Export an HTML element to PDF
 */
export async function exportToPdf(
  element: HTMLElement,
  options: PdfExportOptions = {}
): Promise<void> {
  // Dynamically import html2pdf.js
  const html2pdfModule = await import('html2pdf.js');
  const html2pdfFn = html2pdfModule.default;

  const opts = { ...DEFAULT_OPTIONS, ...options };
  const dimensions = PAGE_DIMENSIONS[opts.format];
  const margins = getMarginConfig(opts.margin);

  // Configure html2pdf options
  const html2pdfOptions = {
    margin: [margins.top, margins.right, margins.bottom, margins.left] as [number, number, number, number],
    filename: opts.filename,
    image: {
      type: 'jpeg' as const,
      quality: 0.98,
    },
    html2canvas: {
      scale: opts.scale,
      useCORS: true,
      logging: false,
      letterRendering: true,
    },
    jsPDF: {
      unit: 'mm' as const,
      format: [dimensions.width, dimensions.height] as [number, number],
      orientation: opts.orientation,
    },
    pagebreak: {
      mode: ['avoid-all', 'css', 'legacy'],
      before: '.page-break-before',
      after: '.page-break-after',
      avoid: '.no-page-break',
    },
  };

  // Generate and save PDF
  await html2pdfFn()
    .from(element)
    .set(html2pdfOptions)
    .save();
}

/**
 * Export an HTML element to PDF and return as Blob
 */
export async function exportToPdfBlob(
  element: HTMLElement,
  options: PdfExportOptions = {}
): Promise<Blob> {
  const html2pdfModule = await import('html2pdf.js');
  const html2pdfFn = html2pdfModule.default;

  const opts = { ...DEFAULT_OPTIONS, ...options };
  const dimensions = PAGE_DIMENSIONS[opts.format];
  const margins = getMarginConfig(opts.margin);

  const html2pdfOptions = {
    margin: [margins.top, margins.right, margins.bottom, margins.left] as [number, number, number, number],
    image: {
      type: 'jpeg' as const,
      quality: 0.98,
    },
    html2canvas: {
      scale: opts.scale,
      useCORS: true,
      logging: false,
      letterRendering: true,
    },
    jsPDF: {
      unit: 'mm' as const,
      format: [dimensions.width, dimensions.height] as [number, number],
      orientation: opts.orientation,
    },
  };

  const blob = await html2pdfFn()
    .from(element)
    .set(html2pdfOptions)
    .outputPdf('blob') as Blob;

  return blob;
}

/**
 * Get PDF export configuration based on page config
 */
export function getPdfOptionsFromPageConfig(pageConfig: {
  formatId: string;
  width: number;
  height: number;
  margins: { top: number; bottom: number; left: number; right: number };
}): PdfExportOptions {
  // Determine format from formatId
  let format: PdfExportOptions['format'] = 'a4';
  if (pageConfig.formatId === 'LETTER') format = 'letter';
  if (pageConfig.formatId === 'LEGAL') format = 'legal';

  // Determine orientation from dimensions
  const isLandscape = pageConfig.width > pageConfig.height;
  const orientation: PdfExportOptions['orientation'] = isLandscape
    ? 'landscape'
    : 'portrait';

  // Convert pixel margins to mm (assuming 96 DPI)
  const pxToMm = (px: number) => Math.round(px * 0.264583);
  const margin = {
    top: pxToMm(pageConfig.margins.top),
    right: pxToMm(pageConfig.margins.right),
    bottom: pxToMm(pageConfig.margins.bottom),
    left: pxToMm(pageConfig.margins.left),
  };

  return {
    format,
    orientation,
    margin,
    scale: 2, // Higher scale for better quality
  };
}
