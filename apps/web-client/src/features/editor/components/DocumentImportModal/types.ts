import type { Editor } from '@tiptap/core';

/**
 * Supported import formats
 */
export type ImportableFormat = 'json' | 'docx' | 'odt' | 'md' | 'pdf';

/**
 * Result of a document conversion
 */
export interface ConversionResult {
  success: boolean;
  format: ImportableFormat;
  content: string | Record<string, unknown>;
  contentType: 'html' | 'json';
  warnings?: string[];
  error?: string;
}

/**
 * Props for DocumentImportModal
 */
export interface DocumentImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editor: Editor;
}

/**
 * Props for FileDropZone
 */
export interface FileDropZoneProps {
  onFileSelect: (file: File, format: ImportableFormat) => void;
  selectedFile: File | null;
  detectedFormat: ImportableFormat | null;
  onClear: () => void;
  disabled?: boolean;
}

/**
 * Format configuration
 */
export interface FormatConfig {
  mimeTypes: string[];
  extensions: string[];
  label: string;
  icon: string;
  disabled?: boolean;
  disabledMessage?: string;
}

/**
 * Supported formats configuration
 */
export const SUPPORTED_FORMATS: Record<ImportableFormat, FormatConfig> = {
  json: {
    mimeTypes: ['application/json'],
    extensions: ['.json'],
    label: 'JSON',
    icon: 'FileJson2',
  },
  docx: {
    mimeTypes: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    extensions: ['.docx'],
    label: 'DOCX',
    icon: 'FileText',
  },
  odt: {
    mimeTypes: ['application/vnd.oasis.opendocument.text'],
    extensions: ['.odt'],
    label: 'ODT',
    icon: 'FileText',
  },
  md: {
    mimeTypes: ['text/markdown', 'text/x-markdown', 'text/plain'],
    extensions: ['.md', '.markdown'],
    label: 'Markdown',
    icon: 'FileCode',
  },
  pdf: {
    mimeTypes: ['application/pdf'],
    extensions: ['.pdf'],
    label: 'PDF',
    icon: 'FileText',
    disabled: true,
    disabledMessage: 'Soporte PDF próximamente',
  },
};

/**
 * Get all accepted MIME types for file input
 */
export function getAcceptedMimeTypes(): string {
  return Object.values(SUPPORTED_FORMATS)
    .filter((f) => !f.disabled)
    .flatMap((f) => f.mimeTypes)
    .join(',');
}

/**
 * Get all accepted extensions for display
 */
export function getAcceptedExtensions(): string[] {
  return Object.values(SUPPORTED_FORMATS)
    .filter((f) => !f.disabled)
    .flatMap((f) => f.extensions);
}

/**
 * Detect format from file
 */
export function detectFormat(file: File): ImportableFormat | null {
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();

  for (const [format, config] of Object.entries(SUPPORTED_FORMATS)) {
    if (config.mimeTypes.includes(file.type) || config.extensions.includes(extension)) {
      return format as ImportableFormat;
    }
  }

  return null;
}

/**
 * Check if format is disabled
 */
export function isFormatDisabled(format: ImportableFormat): boolean {
  return SUPPORTED_FORMATS[format]?.disabled ?? false;
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
