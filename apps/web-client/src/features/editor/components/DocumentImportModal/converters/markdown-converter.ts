import { marked } from 'marked';
import type { ConversionResult } from '../types';

/**
 * Convert Markdown file to HTML using marked
 */
export async function convertMarkdownToHtml(file: File): Promise<ConversionResult> {
  try {
    const text = await file.text();

    if (!text || text.trim().length === 0) {
      return {
        success: false,
        format: 'md',
        content: '',
        contentType: 'html',
        error: 'El archivo Markdown está vacío',
      };
    }

    const html = await marked.parse(text);

    return {
      success: true,
      format: 'md',
      content: html,
      contentType: 'html',
    };
  } catch (error) {
    return {
      success: false,
      format: 'md',
      content: '',
      contentType: 'html',
      error: error instanceof Error
        ? `Error al procesar Markdown: ${error.message}`
        : 'Error desconocido al procesar el archivo Markdown',
    };
  }
}
