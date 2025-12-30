import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Link2, Images } from 'lucide-react';
import { ImageUrlTab } from './ImageUrlTab';
import { ImageGalleryTab } from './ImageGalleryTab';
import { ImageCropper } from './ImageCropper';
import type { ImageInsertModalProps, ImageInsertTab, ImageInsertResult } from './types';

export function ImageInsertModal({
  open,
  onOpenChange,
  onInsert,
}: ImageInsertModalProps) {
  const [activeTab, setActiveTab] = useState<ImageInsertTab>('url');
  const [currentImage, setCurrentImage] = useState<ImageInsertResult | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  const handleImageReady = useCallback((src: string, isBase64: boolean) => {
    setCurrentImage({
      src,
      isBase64,
    });
  }, []);

  const handleCropRequest = useCallback((src: string) => {
    setImageToCrop(src);
    setCropperOpen(true);
  }, []);

  const handleCropSave = useCallback((croppedSrc: string) => {
    setCurrentImage({
      src: croppedSrc,
      isBase64: true,
    });
    setImageToCrop(null);
    setCropperOpen(false);
  }, []);

  const handleCropperClose = useCallback((isOpen: boolean) => {
    setCropperOpen(isOpen);
    if (!isOpen) {
      setImageToCrop(null);
    }
  }, []);

  const handleInsert = useCallback(() => {
    if (currentImage) {
      onInsert(currentImage);
      handleClose();
    }
  }, [currentImage, onInsert]);

  const handleClose = useCallback(() => {
    setActiveTab('url');
    setCurrentImage(null);
    setCropperOpen(false);
    setImageToCrop(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleGallerySelect = useCallback((src: string) => {
    setCurrentImage({
      src,
      isBase64: false,
    });
  }, []);

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Insertar Imagen</DialogTitle>
          </DialogHeader>

          <div className="flex border-b mb-4">
            <button
              type="button"
              onClick={() => setActiveTab('url')}
              className={cn(
                'flex items-center px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === 'url'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Link2 className="h-4 w-4 mr-2" />
              URL
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('gallery')}
              className={cn(
                'flex items-center px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === 'gallery'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Images className="h-4 w-4 mr-2" />
              Galeria
            </button>
          </div>

          <div className="min-h-[300px]">
            {activeTab === 'url' && (
              <ImageUrlTab
                onImageReady={handleImageReady}
                onCropRequest={handleCropRequest}
              />
            )}

            {activeTab === 'gallery' && (
              <ImageGalleryTab onSelectImage={handleGallerySelect} />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button onClick={handleInsert} disabled={!currentImage}>
              Insertar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {imageToCrop && (
        <ImageCropper
          open={cropperOpen}
          onOpenChange={handleCropperClose}
          imageSrc={imageToCrop}
          onSave={handleCropSave}
        />
      )}
    </>
  );
}
