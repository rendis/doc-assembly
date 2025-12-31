import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { FileUp, Loader2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { DocumentImportModalProps, ImportableFormat, ConversionResult } from './types';
import { FileDropZone } from './FileDropZone';
import { convertFile } from './converters';

export function DocumentImportModal({
  open,
  onOpenChange,
  editor,
}: DocumentImportModalProps) {
  const { t } = useTranslation();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [detectedFormat, setDetectedFormat] = useState<ImportableFormat | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);

  const handleFileSelect = useCallback((file: File, format: ImportableFormat) => {
    setSelectedFile(file);
    setDetectedFormat(format);
    setError(null);
    setWarnings([]);
  }, []);

  const handleClear = useCallback(() => {
    setSelectedFile(null);
    setDetectedFormat(null);
    setError(null);
    setWarnings([]);
  }, []);

  const handleImport = useCallback(async () => {
    if (!selectedFile || !detectedFormat || !editor) return;

    setIsConverting(true);
    setError(null);

    try {
      const result: ConversionResult = await convertFile(selectedFile, detectedFormat);

      if (!result.success) {
        setError(result.error || 'Error al convertir el archivo');
        setIsConverting(false);
        return;
      }

      if (result.warnings && result.warnings.length > 0) {
        setWarnings(result.warnings);
      }

      // Insert content into editor
      if (result.contentType === 'json') {
        editor.commands.setContent(result.content as Record<string, unknown>);
      } else if (result.contentType === 'html') {
        editor.commands.setContent(result.content as string);
      }

      // Close modal on success
      onOpenChange(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Error inesperado al importar el documento'
      );
    } finally {
      setIsConverting(false);
    }
  }, [selectedFile, detectedFormat, editor, onOpenChange]);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      // Prevent closing while converting
      if (isConverting) return;

      onOpenChange(newOpen);

      // Reset state when closing
      if (!newOpen) {
        setSelectedFile(null);
        setDetectedFormat(null);
        setError(null);
        setWarnings([]);
      }
    },
    [isConverting, onOpenChange]
  );

  const isValid = selectedFile !== null && detectedFormat !== null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileUp className="h-5 w-5 text-primary" />
            {t('editor.import.title', 'Importar Documento')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'editor.import.description',
              'Importa contenido desde archivos JSON, Word, OpenDocument o Markdown'
            )}
          </DialogDescription>
        </DialogHeader>

        {/* File Drop Zone */}
        <div className="py-2">
          <FileDropZone
            onFileSelect={handleFileSelect}
            selectedFile={selectedFile}
            detectedFormat={detectedFormat}
            onClear={handleClear}
            disabled={isConverting}
          />
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <div className="rounded-lg bg-yellow-500/10 p-3 text-sm">
            <p className="font-medium text-yellow-600 dark:text-yellow-500 mb-1">
              {t('editor.import.warnings', 'Advertencias de conversión:')}
            </p>
            <ul className="list-disc list-inside text-muted-foreground text-xs space-y-0.5">
              {warnings.slice(0, 5).map((warning, i) => (
                <li key={i}>{warning}</li>
              ))}
              {warnings.length > 5 && (
                <li>
                  {t('editor.import.moreWarnings', 'y {{count}} más...', {
                    count: warnings.length - 5,
                  })}
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {/* Footer */}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isConverting}
          >
            {t('common.cancel', 'Cancelar')}
          </Button>
          <Button onClick={handleImport} disabled={!isValid || isConverting}>
            {isConverting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('editor.import.converting', 'Importando...')}
              </>
            ) : (
              <>
                <FileUp className="h-4 w-4 mr-2" />
                {t('editor.import.button', 'Importar')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
