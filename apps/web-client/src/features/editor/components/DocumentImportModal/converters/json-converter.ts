import type { ConversionResult } from '../types';

/**
 * Convert JSON file to editor content
 * Supports the native document format used by the editor
 */
export async function convertJsonToContent(file: File): Promise<ConversionResult> {
  try {
    const text = await file.text();

    if (!text || text.trim().length === 0) {
      return {
        success: false,
        format: 'json',
        content: '',
        contentType: 'json',
        error: 'El archivo JSON está vacío',
      };
    }

    const parsed = JSON.parse(text);

    // Check if it's a PortableDocument (our native format)
    if (parsed.content && typeof parsed.content === 'object') {
      // Extract the ProseMirror content
      return {
        success: true,
        format: 'json',
        content: parsed.content,
        contentType: 'json',
      };
    }

    // Check if it's raw ProseMirror JSON
    if (parsed.type === 'doc' && Array.isArray(parsed.content)) {
      return {
        success: true,
        format: 'json',
        content: parsed,
        contentType: 'json',
      };
    }

    return {
      success: false,
      format: 'json',
      content: '',
      contentType: 'json',
      error: 'El archivo JSON no tiene un formato de documento válido',
    };
  } catch (error) {
    return {
      success: false,
      format: 'json',
      content: '',
      contentType: 'json',
      error: error instanceof Error
        ? `Error al procesar JSON: ${error.message}`
        : 'Error desconocido al procesar el archivo JSON',
    };
  }
}
