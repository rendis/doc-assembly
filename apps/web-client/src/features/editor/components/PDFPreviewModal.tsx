import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { pdfjs, Document, Page } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Loader2, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

// Import worker as Vite asset
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

// Set worker source
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

interface PDFPreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pdfBlob: Blob | null;
  fileName?: string;
}

export function PDFPreviewModal({
  open,
  onOpenChange,
  pdfBlob,
  fileName = 'preview.pdf',
}: PDFPreviewModalProps) {
  const { t } = useTranslation();
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [isLoadingPDF, setIsLoadingPDF] = useState(true);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [scale, setScale] = useState(1.0);
  const [pageInputValue, setPageInputValue] = useState('1');
  const [isFitToWidth, setIsFitToWidth] = useState(true); // Modo fit-to-width por defecto
  const containerRef = useRef<HTMLDivElement>(null);

  // Medir ancho del contenedor para escalar PDF
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        // Restar padding para el ancho real disponible
        const width = containerRef.current.offsetWidth - 32; // 32px de padding
        setContainerWidth(width);
      }
    };

    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [open]);

  // Crear y limpiar blob URL
  useEffect(() => {
    if (pdfBlob) {
      const url = URL.createObjectURL(pdfBlob);
      setBlobUrl(url);
      setIsLoadingPDF(true);

      return () => {
        URL.revokeObjectURL(url);
      };
    }
    setBlobUrl(null);
  }, [pdfBlob]);

  // Sincronizar input de página con pageNumber
  useEffect(() => {
    setPageInputValue(pageNumber.toString());
  }, [pageNumber]);

  // Keyboard shortcuts
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignorar si el usuario está escribiendo en el input
      if ((e.target as HTMLElement).tagName === 'INPUT') return;

      switch (e.key) {
        case 'ArrowLeft':
          if (pageNumber > 1) {
            e.preventDefault();
            setPageNumber((prev) => Math.max(1, prev - 1));
          }
          break;
        case 'ArrowRight':
          if (pageNumber < (numPages || 1)) {
            e.preventDefault();
            setPageNumber((prev) => Math.min(numPages || prev, prev + 1));
          }
          break;
        case '+':
        case '=':
          e.preventDefault();
          setIsFitToWidth(false);
          setScale((prev) => Math.min(prev + 0.25, 3.0));
          break;
        case '-':
          e.preventDefault();
          setIsFitToWidth(false);
          setScale((prev) => Math.max(prev - 0.25, 0.5));
          break;
        case '0':
          e.preventDefault();
          setIsFitToWidth(false);
          setScale(1.0);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, pageNumber, numPages]);

  const onDocumentLoadSuccess = useCallback(({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageNumber(1);
    setIsLoadingPDF(false);
  }, []);

  const goToPrevPage = useCallback(() => {
    setPageNumber((prev) => Math.max(1, prev - 1));
  }, []);

  const goToNextPage = useCallback(() => {
    setPageNumber((prev) => Math.min(numPages || prev, prev + 1));
  }, [numPages]);

  const handleDownload = useCallback(() => {
    if (!pdfBlob) return;

    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [pdfBlob, fileName]);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setIsFitToWidth(false); // Cambiar a modo zoom manual
    setScale((prev) => Math.min(prev + 0.25, 3.0));
  }, []);

  const handleZoomOut = useCallback(() => {
    setIsFitToWidth(false); // Cambiar a modo zoom manual
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  }, []);

  const handleZoomReset = useCallback(() => {
    setIsFitToWidth(false); // Cambiar a modo zoom manual
    setScale(1.0);
  }, []);

  // Page input controls
  const handlePageInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPageInputValue(e.target.value);
  }, []);

  const handlePageInputSubmit = useCallback(() => {
    const pageNum = parseInt(pageInputValue);
    if (pageNum >= 1 && pageNum <= (numPages || 1)) {
      setPageNumber(pageNum);
    } else {
      setPageInputValue(pageNumber.toString());
    }
  }, [pageInputValue, numPages, pageNumber]);

  if (!pdfBlob || !blobUrl) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[90vw] sm:max-h-[90vh] h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>{t('editor.preview.pdfModal.title')}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 relative min-h-0 px-6 pb-4 flex flex-col gap-4">
          {/* PDF Viewer */}
          <div
            ref={containerRef}
            className="flex-1 overflow-auto flex items-start justify-center bg-gray-100 dark:bg-gray-900 rounded p-4"
          >
            {isLoadingPDF && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {t('editor.preview.pdfModal.loading')}
                  </p>
                </div>
              </div>
            )}

            <Document
              file={blobUrl}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={(error) => {
                console.error('Error loading PDF:', error);
                setIsLoadingPDF(false);
              }}
              loading={
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              }
              error={
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <p className="text-destructive mb-4">
                    {t('editor.preview.pdfModal.error')}
                  </p>
                  <Button onClick={handleDownload} variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    {t('editor.preview.download')}
                  </Button>
                </div>
              }
            >
              <Page
                pageNumber={pageNumber}
                width={isFitToWidth ? containerWidth || undefined : undefined}
                scale={isFitToWidth ? undefined : scale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="shadow-lg"
              />
            </Document>
          </div>

          {/* Navigation Controls - Toolbar Compacta */}
          {numPages && numPages > 1 && (
            <div className="flex items-center justify-between gap-4 px-4 py-2.5 bg-card border border-border rounded-lg shadow-sm">
              {/* Navigation Controls */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={goToPrevPage}
                  disabled={pageNumber === 1}
                  title={t('common.previous')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={goToNextPage}
                  disabled={pageNumber === numPages}
                  title={t('common.next')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Page Counter with Input */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {t('editor.preview.pdfModal.page')}
                </span>
                <input
                  type="number"
                  min="1"
                  max={numPages}
                  value={pageInputValue}
                  onChange={handlePageInputChange}
                  onBlur={handlePageInputSubmit}
                  onKeyDown={(e) => e.key === 'Enter' && handlePageInputSubmit()}
                  className="w-12 h-8 px-2 text-center text-sm border border-border rounded bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <span className="text-sm text-muted-foreground">
                  / {numPages}
                </span>
              </div>

              {/* Zoom Controls */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleZoomOut}
                  disabled={scale <= 0.5}
                  title={t('editor.preview.pdfModal.zoomOut')}
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground min-w-[3rem] text-center">
                  {isFitToWidth ? 'Auto' : `${Math.round(scale * 100)}%`}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleZoomIn}
                  disabled={scale >= 3.0}
                  title={t('editor.preview.pdfModal.zoomIn')}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleZoomReset}
                  title={t('editor.preview.pdfModal.zoomReset')}
                >
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 pb-6">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('editor.preview.close')}
          </Button>
          <Button onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            {t('editor.preview.download')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
