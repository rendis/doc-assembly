import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { pdfjs, Document, Page } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import {
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'

import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl

interface PDFPreviewProps {
  token: string
  documentTitle: string
  recipientName: string
  onProceed: () => void
  isLoading: boolean
}

export function PDFPreview({
  token,
  documentTitle,
  recipientName,
  onProceed,
  isLoading,
}: PDFPreviewProps) {
  const { t } = useTranslation()
  const [loadingPdf, setLoadingPdf] = useState(true)
  const [pdfError, setPdfError] = useState(false)
  const [numPages, setNumPages] = useState<number | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [containerWidth, setContainerWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  // Build the PDF URL — react-pdf will fetch it directly.
  const basePath = (import.meta.env.VITE_BASE_PATH || '').replace(/\/$/, '')
  const pdfUrl = useMemo(
    () => `${basePath}/public/sign/${token}/pdf`,
    [basePath, token],
  )

  // Measure container width for scaling.
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth - 32)
      }
    }
    updateWidth()
    window.addEventListener('resize', updateWidth)
    return () => window.removeEventListener('resize', updateWidth)
  }, [])

  const onDocumentLoadSuccess = useCallback(
    ({ numPages }: { numPages: number }) => {
      setNumPages(numPages)
      setPageNumber(1)
      setLoadingPdf(false)
    },
    [],
  )

  const goToPrevPage = useCallback(() => {
    setPageNumber((prev) => Math.max(1, prev - 1))
  }, [])

  const goToNextPage = useCallback(() => {
    setPageNumber((prev) => Math.min(numPages || prev, prev + 1))
  }, [numPages])

  if (pdfError) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col items-center gap-4 py-12 rounded-lg border border-border bg-card">
          <AlertCircle size={48} className="text-destructive" />
          <p className="text-sm text-muted-foreground">
            {t('publicSigning.preview.pdfError')}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Document info */}
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-foreground">
          {documentTitle}
        </h2>
        <p className="text-sm text-muted-foreground">
          {t('publicSigning.preview.readyToSign', { name: recipientName })}
        </p>
      </div>

      {/* PDF viewer */}
      <div
        ref={containerRef}
        className="relative overflow-auto rounded-lg border border-border bg-muted/30 p-4"
        style={{ minHeight: '400px', maxHeight: '70vh' }}
      >
        {loadingPdf && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                {t('publicSigning.preview.pdfLoading')}
              </p>
            </div>
          </div>
        )}

        <Document
          file={pdfUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={(error) => {
            console.error('PDF load error:', error)
            setPdfError(true)
            setLoadingPdf(false)
          }}
          loading={null}
        >
          <Page
            pageNumber={pageNumber}
            width={containerWidth || undefined}
            renderTextLayer={true}
            renderAnnotationLayer={true}
            className="mx-auto shadow-lg"
          />
        </Document>
      </div>

      {/* Page navigation */}
      {numPages && numPages > 1 && (
        <div className="flex items-center justify-center gap-4 py-2">
          <button
            type="button"
            onClick={goToPrevPage}
            disabled={pageNumber === 1}
            className="p-2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
            {t('publicSigning.preview.pageOf', {
              current: pageNumber,
              total: numPages,
            })}
          </span>
          <button
            type="button"
            onClick={goToNextPage}
            disabled={pageNumber === numPages}
            className="p-2 text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Proceed button */}
      <button
        type="button"
        onClick={onProceed}
        disabled={isLoading || loadingPdf}
        className={cn(
          'flex w-full items-center justify-center gap-3 rounded-none py-3.5',
          'font-mono text-sm uppercase tracking-wider transition-colors',
          'bg-foreground text-background hover:bg-foreground/90',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        {isLoading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            <span>{t('publicSigning.proceeding.title')}</span>
          </>
        ) : (
          <>
            <span>{t('publicSigning.preview.proceedToSigning')}</span>
            <ArrowRight size={16} />
          </>
        )}
      </button>
    </div>
  )
}
