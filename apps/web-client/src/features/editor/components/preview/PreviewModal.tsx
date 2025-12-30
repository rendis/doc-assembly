import { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
// @ts-expect-error - TipTap types export issue in strict mode
import type { Editor } from '@tiptap/core';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Edit3, Download, Loader2, X } from 'lucide-react';
import { DocumentPreviewRenderer } from './DocumentPreviewRenderer';
import { VariableInputModal } from './VariableInputModal';
import type { PreviewVariable, VariableValue } from '../../types/preview';
import { createPreviewState } from '../../services/preview-service';
import { exportToPdf, getPdfOptionsFromPageConfig } from '../../services/pdf-export-service';
import { useInjectablesStore } from '../../stores/injectables-store';
import { usePaginationStore } from '../../stores/pagination-store';

interface PreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editor: Editor | null;
}

type PreviewStep = 'input' | 'preview';

export const PreviewModal = ({ open, onOpenChange, editor }: PreviewModalProps) => {
  const { t } = useTranslation();
  const previewRef = useRef<HTMLDivElement>(null);

  const { injectables } = useInjectablesStore();
  const { config: pageConfig } = usePaginationStore();

  // State
  const [step, setStep] = useState<PreviewStep>('input');
  const [variables, setVariables] = useState<PreviewVariable[]>([]);
  const [values, setValues] = useState<Record<string, VariableValue>>({});
  const [isExporting, setIsExporting] = useState(false);
  const [content, setContent] = useState<unknown>(null);

  // Initialize when modal opens
  useEffect(() => {
    if (open && editor) {
      const state = createPreviewState(editor, injectables);
      setVariables(state.variables);
      setValues(state.initialValues);
      setContent(editor.getJSON());

      // If there are missing variables, show input modal
      // Otherwise, go directly to preview
      if (state.missingVariables.length > 0) {
        setStep('input');
      } else {
        setStep('preview');
      }
    }
  }, [open, editor, injectables]);

  // Handle variable input submission
  const handleVariableSubmit = useCallback(
    (newValues: Record<string, VariableValue>) => {
      setValues((prev) => ({ ...prev, ...newValues }));
      setStep('preview');
    },
    []
  );

  // Handle edit variables button
  const handleEditVariables = useCallback(() => {
    setStep('input');
  }, []);

  // Handle cancel from variable input
  const handleVariableCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  // Handle PDF export
  const handleExportPdf = useCallback(async () => {
    if (!previewRef.current) return;

    setIsExporting(true);
    try {
      const pdfOptions = getPdfOptionsFromPageConfig({
        formatId: pageConfig.format.id,
        width: pageConfig.format.width,
        height: pageConfig.format.height,
        margins: pageConfig.format.margins,
      });

      await exportToPdf(previewRef.current, {
        ...pdfOptions,
        filename: `documento-${Date.now()}.pdf`,
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
    } finally {
      setIsExporting(false);
    }
  }, [pageConfig]);

  // Handle modal close
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        // Reset state when closing
        setStep('input');
        setVariables([]);
        setValues({});
        setContent(null);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  // Show variable input modal
  if (step === 'input') {
    return (
      <VariableInputModal
        open={open}
        onOpenChange={handleOpenChange}
        variables={variables}
        initialValues={values}
        onSubmit={handleVariableSubmit}
        onCancel={handleVariableCancel}
      />
    );
  }

  // Show preview modal
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] w-[900px] max-h-[95vh] h-[90vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b flex-row items-center justify-between space-y-0">
          <DialogTitle>
            {t('editor.preview.title', 'Vista Previa del Documento')}
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleEditVariables}
              disabled={isExporting}
            >
              <Edit3 className="h-4 w-4 mr-2" />
              {t('editor.preview.editVariables', 'Editar Variables')}
            </Button>
            <Button
              size="sm"
              onClick={handleExportPdf}
              disabled={isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              {t('editor.preview.downloadPdf', 'Descargar PDF')}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 bg-muted/30">
          <div className="p-8 flex justify-center">
            <div ref={previewRef} className="preview-container">
              <DocumentPreviewRenderer content={content} values={values} />
            </div>
          </div>
        </ScrollArea>

        {/* Variable summary footer */}
        {variables.length > 0 && (
          <div className="px-6 py-3 border-t bg-muted/30">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>
                {t('editor.preview.variableCount', 'Variables:')} {variables.length}
              </span>
              {Object.keys(values).length > 0 && (
                <span>
                  {t('editor.preview.filledCount', 'Completadas:')}{' '}
                  {
                    Object.values(values).filter(
                      (v) => v.value !== null && v.value !== ''
                    ).length
                  }
                </span>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
