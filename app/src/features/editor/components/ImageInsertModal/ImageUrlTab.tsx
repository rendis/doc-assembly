import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Crop, Loader2, AlertCircle, ImageIcon, Shuffle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ImageVariableTab } from './ImageVariableTab'
import type { ImageUrlTabProps, ImagePreviewState, ImageSourceMode } from './types'

const URL_REGEX = /^https?:\/\/.+/i
const DEBOUNCE_MS = 500

const generateTestImageUrl = () => {
  const seed = Math.random().toString(36).substring(7)
  return `https://picsum.photos/seed/${seed}/400/300`
}

export function ImageUrlTab({
  onImageReady,
  onOpenCropper,
  currentImage,
}: ImageUrlTabProps) {
  const { t } = useTranslation()
  const isGalleryImage = currentImage?.src?.startsWith('storage://') ?? false
  const currentDirectImage =
    currentImage && !currentImage.injectableId && !isGalleryImage
      ? currentImage
      : null
  const [sourceMode, setSourceMode] = useState<ImageSourceMode>(
    currentImage?.injectableId ? 'variable' : 'url',
  )
  const [url, setUrl] = useState(currentDirectImage?.src ?? '')
  const [preview, setPreview] = useState<ImagePreviewState>({
    src: currentDirectImage?.src ?? null,
    isLoading: false,
    error: null,
    isBase64: currentDirectImage?.isBase64 ?? false,
  })
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const loadImage = useCallback((imageUrl: string) => {
    if (!URL_REGEX.test(imageUrl)) {
      setPreview({
        src: null,
        isLoading: false,
        error: t('editor.image.modal.invalidUrl'),
        isBase64: false,
      })
      onImageReady(null)
      return
    }

    setPreview((prev) => ({ ...prev, isLoading: true, error: null }))

    const img = new Image()
    img.crossOrigin = 'anonymous'

    img.onload = () => {
      setPreview({
        src: imageUrl,
        isLoading: false,
        error: null,
        isBase64: false,
      })
      onImageReady({
        src: imageUrl,
        isBase64: false,
      })
    }

    img.onerror = () => {
      setPreview({
        src: null,
        isLoading: false,
        error: t('editor.image.modal.loadError'),
        isBase64: false,
      })
      onImageReady(null)
    }

    img.src = imageUrl
  }, [onImageReady, t])

  const handleUrlChange = useCallback((value: string) => {
    setUrl(value)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (!value.trim()) {
      setPreview({
        src: null,
        isLoading: false,
        error: null,
        isBase64: false,
      })
      onImageReady(null)
      return
    }

    debounceRef.current = setTimeout(() => {
      loadImage(value.trim())
    }, DEBOUNCE_MS)
  }, [loadImage, onImageReady])

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  useEffect(() => {
    let cancelled = false

    const syncFromCurrentImage = () => {
      if (cancelled) {
        return
      }

      if (currentImage?.injectableId) {
        setSourceMode('variable')
        setUrl('')
        setPreview({
          src: null,
          isLoading: false,
          error: null,
          isBase64: false,
        })
        return
      }

      if (currentDirectImage) {
        setSourceMode('url')
        setUrl(currentDirectImage.src)
        setPreview({
          src: currentDirectImage.src,
          isLoading: false,
          error: null,
          isBase64: currentDirectImage.isBase64,
        })
      }
    }

    queueMicrotask(syncFromCurrentImage)

    return () => {
      cancelled = true
    }
  }, [currentImage?.injectableId, currentDirectImage])

  const handleCropClick = useCallback(() => {
    if (preview.src) {
      onOpenCropper(preview.src)
    }
  }, [preview.src, onOpenCropper])

  const handleGenerateTestImage = useCallback(() => {
    const testUrl = generateTestImageUrl()
    setUrl(testUrl)
    loadImage(testUrl)
  }, [loadImage])

  const handleSourceModeChange = useCallback((nextMode: ImageSourceMode) => {
    setSourceMode(nextMode)

    if (nextMode === 'variable') {
      setPreview({
        src: null,
        isLoading: false,
        error: null,
        isBase64: false,
      })
      onImageReady(null)
      return
    }

    if (currentImage?.injectableId) {
      onImageReady(null)
    }
  }, [currentImage?.injectableId, onImageReady])

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>{t('editor.image.modal.sourceLabel')}</Label>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleSourceModeChange('url')}
            className={cn(
              'rounded-none border px-3 py-2 text-sm transition-colors',
              sourceMode === 'url'
                ? 'border-primary bg-primary/5 text-foreground'
                : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground',
            )}
          >
            {t('editor.image.modal.sourceUrl')}
          </button>
          <button
            type="button"
            onClick={() => handleSourceModeChange('variable')}
            className={cn(
              'rounded-none border px-3 py-2 text-sm transition-colors',
              sourceMode === 'variable'
                ? 'border-primary bg-primary/5 text-foreground'
                : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground',
            )}
          >
            {t('editor.image.modal.sourceVariable')}
          </button>
        </div>
      </div>

      {sourceMode === 'variable' ? (
        <ImageVariableTab
          onSelect={onImageReady}
          currentSelection={currentImage?.injectableId}
        />
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="image-url">{t('editor.image.modal.urlLabel')}</Label>
            <div className="flex gap-2">
              <Input
                id="image-url"
                type="url"
                placeholder={t('editor.image.modal.urlPlaceholder')}
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                className="flex-1"
              />
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleGenerateTestImage}
                    >
                      <Shuffle className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>{t('editor.image.modal.testImage')}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>

          <div className="min-h-[200px] rounded-lg bg-muted flex items-center justify-center overflow-hidden">
            {preview.isLoading && (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="text-sm">{t('editor.image.modal.loading')}</span>
              </div>
            )}

            {preview.error && (
              <div className="flex flex-col items-center gap-2 text-destructive">
                <AlertCircle className="h-8 w-8" />
                <span className="text-sm text-center px-4">{preview.error}</span>
              </div>
            )}

            {!preview.isLoading && !preview.error && !preview.src && (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <ImageIcon className="h-12 w-12" />
                <span className="text-sm">{t('editor.image.modal.enterUrl')}</span>
              </div>
            )}

            {!preview.isLoading && !preview.error && preview.src && (
              <img
                src={preview.src}
                alt={t('editor.image.modal.preview')}
                className="max-h-[200px] max-w-full object-contain"
                crossOrigin="anonymous"
              />
            )}
          </div>

          {preview.src && !preview.isLoading && !preview.error && (
            <Button
              variant="outline"
              onClick={handleCropClick}
              className="w-full"
            >
              <Crop className="h-4 w-4 mr-2" />
              {t('editor.image.modal.cropImage')}
            </Button>
          )}
        </>
      )}
    </div>
  )
}
