import mammoth from 'mammoth';
import type { ConversionResult } from '../types';

/**
 * Convert ODT file to HTML using mammoth.js
 * Note: mammoth has partial support for ODT files
 */
export async function convertOdtToHtml(file: File): Promise<ConversionResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });

    if (!result.value || result.value.trim().length === 0) {
      return {
        success: false,
        format: 'odt',
        content: '',
        contentType: 'html',
        error: 'El archivo ODT está vacío o no contiene contenido convertible',
      };
    }

    return {
      success: true,
      format: 'odt',
      content: result.value,
      contentType: 'html',
      warnings: result.messages
        .filter((m) => m.type === 'warning')
        .map((m) => m.message),
    };
  } catch (error) {
    return {
      success: false,
      format: 'odt',
      content: '',
      contentType: 'html',
      error: error instanceof Error
        ? `Error al procesar ODT: ${error.message}`
        : 'Error desconocido al procesar el archivo ODT',
    };
  }
}
