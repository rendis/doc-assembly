import type { ConversionResult, ImportableFormat } from '../types';
import { convertDocxToHtml } from './docx-converter';
import { convertOdtToHtml } from './odt-converter';
import { convertMarkdownToHtml } from './markdown-converter';
import { convertJsonToContent } from './json-converter';

export { convertDocxToHtml } from './docx-converter';
export { convertOdtToHtml } from './odt-converter';
export { convertMarkdownToHtml } from './markdown-converter';
export { convertJsonToContent } from './json-converter';

/**
 * Convert a file based on its detected format
 */
export async function convertFile(
  file: File,
  format: ImportableFormat
): Promise<ConversionResult> {
  switch (format) {
    case 'docx':
      return convertDocxToHtml(file);
    case 'odt':
      return convertOdtToHtml(file);
    case 'md':
      return convertMarkdownToHtml(file);
    case 'json':
      return convertJsonToContent(file);
    case 'pdf':
      return {
        success: false,
        format: 'pdf',
        content: '',
        contentType: 'html',
        error: 'El soporte para PDF estará disponible próximamente',
      };
    default:
      return {
        success: false,
        format,
        content: '',
        contentType: 'html',
        error: `Formato no soportado: ${format}`,
      };
  }
}
