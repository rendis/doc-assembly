/**
 * File Upload Tab for AI Generate Modal
 *
 * Allows users to upload images, PDFs, or Word documents via:
 * - Drag & drop
 * - Click to select file
 *
 * Displays preview of selected file and validates type/size.
 */

import { useState, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, FileImage, FileText, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { FileUploadTabProps } from './types';
import {
  validateFile,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE_MB,
  getFileTypeName,
  formatFileSize,
} from '../../utils/file-converters';

export function FileUploadTab({ onFileReady, selectedFile }: FileUploadTabProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);

      // Validate file
      const validation = validateFile(file, ALLOWED_MIME_TYPES, MAX_FILE_SIZE_MB);
      if (!validation.valid) {
        setError(validation.error || 'Archivo inválido');
        return;
      }

      onFileReady(file);
    },
    [onFileReady]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  const handleClickUpload = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleRemoveFile = useCallback(() => {
    onFileReady(null as any); // Reset selected file
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFileReady]);

  return (
    <div className="flex flex-col gap-4">
      {/* Drag & Drop Zone */}
      {!selectedFile && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClickUpload}
          className={`
            relative border-2 border-dashed rounded-lg p-8
            flex flex-col items-center justify-center gap-4
            cursor-pointer transition-colors min-h-[300px]
            ${
              isDragging
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary hover:bg-accent/50'
            }
          `}
        >
          <Upload className="h-12 w-12 text-muted-foreground" />
          <div className="text-center space-y-2">
            <p className="text-sm font-medium">
              {t('editor.fileUploadHint', 'Arrastra un archivo aquí o haz clic para seleccionar')}
            </p>
            <p className="text-xs text-muted-foreground">
              {t(
                'editor.fileUploadSupported',
                'Soportado: Imágenes (PNG, JPG), PDF, Word (.docx)'
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {t('editor.fileUploadMaxSize', `Tamaño máximo: ${MAX_FILE_SIZE_MB}MB`)}
            </p>
          </div>

          {/* File Icons */}
          <div className="flex gap-4 mt-2">
            <div className="flex flex-col items-center gap-1">
              <FileImage className="h-8 w-8 text-blue-500" />
              <span className="text-xs text-muted-foreground">IMG</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <FileText className="h-8 w-8 text-red-500" />
              <span className="text-xs text-muted-foreground">PDF</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <FileText className="h-8 w-8 text-blue-600" />
              <span className="text-xs text-muted-foreground">DOCX</span>
            </div>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ALLOWED_MIME_TYPES.join(',')}
            onChange={handleFileInputChange}
            className="hidden"
          />
        </div>
      )}

      {/* Selected File Preview */}
      {selectedFile && (
        <div className="border rounded-lg p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3 flex-1">
              {selectedFile.type.startsWith('image/') ? (
                <FileImage className="h-10 w-10 text-blue-500 flex-shrink-0" />
              ) : (
                <FileText
                  className={`h-10 w-10 flex-shrink-0 ${
                    selectedFile.type === 'application/pdf' ? 'text-red-500' : 'text-blue-600'
                  }`}
                />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {getFileTypeName(selectedFile)} · {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemoveFile}
              className="h-8 w-8 p-0 flex-shrink-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Image Preview */}
          {selectedFile.type.startsWith('image/') && (
            <div className="mt-3 rounded overflow-hidden border">
              <img
                src={URL.createObjectURL(selectedFile)}
                alt="Preview"
                className="w-full h-auto max-h-[300px] object-contain bg-muted"
              />
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
