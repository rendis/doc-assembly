import { useCallback, useRef, useState } from 'react';
import { Upload, X, FileText, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { FileDropZoneProps, ImportableFormat } from './types';
import {
  SUPPORTED_FORMATS,
  detectFormat,
  isFormatDisabled,
  formatFileSize,
  getAcceptedMimeTypes,
} from './types';
import { FormatBadge } from './FormatBadge';

export function FileDropZone({
  onFileSelect,
  selectedFile,
  detectedFormat,
  onClear,
  disabled,
}: FileDropZoneProps) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      setError(null);
      const format = detectFormat(file);

      if (!format) {
        setError(t('editor.import.unsupportedFormat', 'Formato de archivo no soportado'));
        return;
      }

      if (isFormatDisabled(format)) {
        setError(SUPPORTED_FORMATS[format].disabledMessage || 'Formato no disponible');
        return;
      }

      onFileSelect(file, format);
    },
    [onFileSelect, t]
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

      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFile(file);
      }
    },
    [disabled, handleFile]
  );

  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
      // Reset input so same file can be selected again
      e.target.value = '';
    },
    [handleFile]
  );

  const formats = Object.entries(SUPPORTED_FORMATS) as [ImportableFormat, typeof SUPPORTED_FORMATS[ImportableFormat]][];

  // Show selected file
  if (selectedFile && detectedFormat) {
    return (
      <div className="rounded-lg border bg-muted/30 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm truncate max-w-[200px]">
                {selectedFile.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FormatBadge format={detectedFormat} size="sm" />
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClear}
              disabled={disabled}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={cn(
          'relative flex min-h-[200px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept={getAcceptedMimeTypes()}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />

        <Upload
          className={cn(
            'h-10 w-10 mb-4',
            isDragging ? 'text-primary' : 'text-muted-foreground'
          )}
        />

        <p className="text-sm font-medium text-center">
          {t('editor.import.dropzone.title', 'Arrastra un archivo aquí')}
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          {t('editor.import.dropzone.subtitle', 'o haz clic para seleccionar')}
        </p>

        {/* Format badges */}
        <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
          {formats.map(([format, config]) => (
            <FormatBadge
              key={format}
              format={format}
              size="sm"
              disabled={config.disabled}
            />
          ))}
        </div>

        {/* Disabled formats note */}
        <p className="text-[10px] text-muted-foreground mt-2">
          * {t('editor.import.comingSoon', 'próximamente')}
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
