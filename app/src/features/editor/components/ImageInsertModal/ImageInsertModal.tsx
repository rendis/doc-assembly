import { useCallback, useEffect, useState } from 'react'
import { X, Link, Images, Database } from 'lucide-react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { cn } from '@/lib/utils'
import { getAuthConfig } from '@/lib/auth-config'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ImageUrlTab } from './ImageUrlTab'
import { ImageGalleryTab } from './ImageGalleryTab'
import { ImageVariableTab } from './ImageVariableTab'
import { ImageCropper } from './ImageCropper'
import type { ImageInsertModalProps, ImageInsertResult, ImageInsertTab } from './types'
import type { ImageShape } from '../../extensions/Image/types'

function resolveInitialTab(
  image: ImageInsertResult | undefined,
  galleryEnabled: boolean,
): ImageInsertTab {
  if (image?.injectableId) {
    return 'variable'
  }
  if (galleryEnabled && image?.src?.startsWith('storage://')) {
    return 'gallery'
  }
  return 'url'
}

export function ImageInsertModal({
  open,
  onOpenChange,
  onInsert,
  initialShape = 'square',
  initialImage,
}: ImageInsertModalProps) {
  const [galleryEnabled, setGalleryEnabled] = useState(false)
  const [activeTab, setActiveTab] = useState<ImageInsertTab>('url')
  const [currentImage, setCurrentImage] = useState<ImageInsertResult | null>(null)
  const [cropperOpen, setCropperOpen] = useState(false)
  const [imageToCrop, setImageToCrop] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    getAuthConfig()
      .then((config) => {
        if (!cancelled) {
          const nextGalleryEnabled = Boolean(config.features?.gallery)
          setGalleryEnabled(nextGalleryEnabled)
          if (
            nextGalleryEnabled &&
            open &&
            initialImage?.src?.startsWith('storage://') &&
            !initialImage.injectableId
          ) {
            setActiveTab('gallery')
          }
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGalleryEnabled(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [initialImage?.injectableId, initialImage?.src, open])

  // Reset form when dialog opens (adjust state based on props)
  const [prevOpen, setPrevOpen] = useState(open)
  if (open !== prevOpen) {
    setPrevOpen(open)
    if (open) {
      setCurrentImage(initialImage ?? null)
      setActiveTab(resolveInitialTab(initialImage, galleryEnabled))
      setImageToCrop(null)
      setCropperOpen(false)
    } else {
      setCurrentImage(null)
      setActiveTab('url')
      setImageToCrop(null)
      setCropperOpen(false)
    }
  }

  const handleOpenCropper = useCallback((imageSrc: string) => {
    setImageToCrop(imageSrc)
    setCropperOpen(true)
  }, [])

  const handleCropSave = useCallback((croppedImage: string, shape: ImageShape) => {
    setCurrentImage({
      src: croppedImage,
      isBase64: true,
      shape,
    })
  }, [])

  const handleInsert = useCallback(() => {
    if (currentImage) {
      onInsert(currentImage)
      onOpenChange(false)
    }
  }, [currentImage, onInsert, onOpenChange])

  const handleClose = useCallback(() => {
    setCurrentImage(null)
    setImageToCrop(null)
    setCropperOpen(false)
    setActiveTab('url')
    onOpenChange(false)
  }, [onOpenChange])

  const handleGallerySelect = useCallback((result: ImageInsertResult) => {
    setCurrentImage(result)
  }, [])

  const handleVariableSelect = useCallback((result: ImageInsertResult) => {
    setCurrentImage(result)
  }, [])

  const handleTabChange = useCallback((tab: ImageInsertTab) => {
    setActiveTab(tab)
  }, [])

  const gallerySelectionKey = currentImage?.src?.startsWith('storage://')
    ? currentImage.src.slice('storage://'.length)
    : undefined
  const displayedTab =
    !galleryEnabled && activeTab === 'gallery'
      ? currentImage?.injectableId
        ? 'variable'
        : 'url'
      : activeTab

  return (
    <>
      <DialogPrimitive.Root open={open} onOpenChange={handleClose}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            className={cn(
              'fixed left-[50%] top-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] border border-border bg-background p-0 shadow-lg duration-200',
              'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            )}
          >
            <div className="flex items-start justify-between border-b border-border p-6">
              <div>
                <DialogPrimitive.Title className="font-mono text-sm font-medium uppercase tracking-widest text-foreground">
                  Insertar imagen
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="mt-1 text-sm font-light text-muted-foreground">
                  Añade una imagen desde URL{galleryEnabled ? ', galería' : ''} o variable
                </DialogPrimitive.Description>
              </div>
              <DialogPrimitive.Close className="text-muted-foreground transition-colors hover:text-foreground">
                <X className="h-5 w-5" />
                <span className="sr-only">Close</span>
              </DialogPrimitive.Close>
            </div>

            <div className="p-6">
              <Tabs value={displayedTab} onValueChange={(v) => handleTabChange(v as ImageInsertTab)}>
                <TabsList className={cn('grid w-full rounded-none', galleryEnabled ? 'grid-cols-3' : 'grid-cols-2')}>
                  <TabsTrigger value="url" className="gap-2 rounded-none font-mono text-xs uppercase tracking-wider">
                    <Link className="h-4 w-4" />
                    URL
                  </TabsTrigger>
                  {galleryEnabled && (
                    <TabsTrigger value="gallery" className="gap-2 rounded-none font-mono text-xs uppercase tracking-wider">
                      <Images className="h-4 w-4" />
                      Galería
                    </TabsTrigger>
                  )}
                  <TabsTrigger value="variable" className="gap-2 rounded-none font-mono text-xs uppercase tracking-wider">
                    <Database className="h-4 w-4" />
                    Variable
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="url" className="mt-4">
                  <ImageUrlTab
                    onImageReady={setCurrentImage}
                    onOpenCropper={handleOpenCropper}
                    currentImage={currentImage}
                  />
                </TabsContent>

                {galleryEnabled && (
                  <TabsContent value="gallery" className="mt-4">
                    <ImageGalleryTab
                      onSelect={handleGallerySelect}
                      currentSelectionKey={gallerySelectionKey}
                    />
                  </TabsContent>
                )}

                <TabsContent value="variable" className="mt-4">
                  <ImageVariableTab
                    onSelect={handleVariableSelect}
                    currentSelection={currentImage?.injectableId}
                    hasUrlSelection={Boolean(currentImage && !currentImage.injectableId)}
                  />
                </TabsContent>
              </Tabs>
            </div>

            <div className="flex justify-end gap-3 border-t border-border p-6">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-none border border-border bg-background px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleInsert}
                disabled={!currentImage}
                className="rounded-none bg-foreground px-6 py-2.5 font-mono text-xs uppercase tracking-wider text-background transition-colors hover:bg-foreground/90 disabled:opacity-50"
              >
                Insertar imagen
              </button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {imageToCrop && (
        <ImageCropper
          open={cropperOpen}
          onOpenChange={setCropperOpen}
          imageSrc={imageToCrop}
          onSave={handleCropSave}
          initialShape={initialShape}
        />
      )}
    </>
  )
}
