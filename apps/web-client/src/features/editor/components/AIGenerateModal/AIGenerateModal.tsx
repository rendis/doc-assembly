/**
 * AI Generate Modal
 *
 * Main modal for generating contracts with AI.
 * Provides two methods of input:
 * 1. File Upload (image/PDF/Word)
 * 2. Text Description
 */

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Upload, FileText, Loader2, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { AIGenerateModalProps, AIGenerateTab, GenerateRequest } from './types';
import { FileUploadTab } from './FileUploadTab';
import { TextDescriptionTab } from './TextDescriptionTab';
import {
  fileToBase64,
  extractTextFromDocx,
  getContentTypeFromFile,
} from '../../utils/file-converters';

const MIN_TEXT_CHARS = 50;

export function AIGenerateModal({
  open,
  onOpenChange,
  onGenerate,
  isGenerating,
  externalError,
}: AIGenerateModalProps) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<AIGenerateTab>('file');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [textDescription, setTextDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Combined error: prefer external error (from API) over local error (from file processing)
  const displayError = externalError || error;

  const handleGenerate = useCallback(async () => {
    setError(null);

    try {
      if (activeTab === 'file' && selectedFile) {
        const contentType = getContentTypeFromFile(selectedFile);

        if (contentType === 'docx') {
          // Extract text from Word file
          const text = await extractTextFromDocx(selectedFile);
          const request: GenerateRequest = {
            contentType: 'text',
            content: text,
          };
          await onGenerate(request);
        } else {
          // Convert to base64 for image/PDF
          const base64 = await fileToBase64(selectedFile);
          const request: GenerateRequest = {
            contentType,
            content: base64,
            mimeType: selectedFile.type,
          };
          await onGenerate(request);
        }
      } else if (activeTab === 'text' && textDescription.trim()) {
        const request: GenerateRequest = {
          contentType: 'text',
          content: textDescription.trim(),
        };
        await onGenerate(request);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar el contenido');
    }
  }, [activeTab, selectedFile, textDescription, onGenerate]);

  const isValid =
    (activeTab === 'file' && selectedFile !== null) ||
    (activeTab === 'text' && textDescription.trim().length >= MIN_TEXT_CHARS);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      // Prevent closing while generating
      if (isGenerating) return;

      onOpenChange(newOpen);

      // Reset state when closing
      if (!newOpen) {
        setActiveTab('file');
        setSelectedFile(null);
        setTextDescription('');
        setError(null);
      }
    },
    [isGenerating, onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-500" />
            {t('editor.aiGenerateTitle', 'Generar Contrato con IA')}
          </DialogTitle>
          <DialogDescription>
            {t(
              'editor.aiGenerateSubtitle',
              'Usa IA para crear un contrato a partir de una imagen, PDF, archivo Word o descripción de texto'
            )}
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="flex border-b mb-4">
          <button
            type="button"
            onClick={() => setActiveTab('file')}
            disabled={isGenerating}
            className={cn(
              'flex items-center px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'file'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
              isGenerating && 'opacity-50 cursor-not-allowed'
            )}
          >
            <Upload className="h-4 w-4 mr-2" />
            {t('editor.fileUploadTab', 'Subir Archivo')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            disabled={isGenerating}
            className={cn(
              'flex items-center px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === 'text'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground',
              isGenerating && 'opacity-50 cursor-not-allowed'
            )}
          >
            <FileText className="h-4 w-4 mr-2" />
            {t('editor.textDescriptionTab', 'Descripción')}
          </button>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px]">
          {activeTab === 'file' && (
            <FileUploadTab onFileReady={setSelectedFile} selectedFile={selectedFile} />
          )}
          {activeTab === 'text' && (
            <TextDescriptionTab onTextChange={setTextDescription} text={textDescription} />
          )}
        </div>

        {/* Error Display */}
        {displayError && (
          <div className="flex items-start gap-2 bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
            <p>{displayError}</p>
          </div>
        )}

        {/* Footer */}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isGenerating}
          >
            {t('common.cancel', 'Cancelar')}
          </Button>
          <Button onClick={handleGenerate} disabled={!isValid || isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('editor.generating', 'Generando...')}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                {t('editor.generateButton', 'Generar')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
