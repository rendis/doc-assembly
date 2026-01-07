import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Link, Images } from 'lucide-react';
import { ImageUrlTab } from './ImageUrlTab';
import { ImageGalleryTab } from './ImageGalleryTab';
import { ImageCropper } from './ImageCropper';
import type { ImageInsertModalProps, ImageInsertResult, ImageInsertTab } from './types';
import type { ImageShape } from '../../extensions/Image/types';

export function ImageInsertModal({
  open,
  onOpenChange,
  onInsert,
  initialShape = 'square',
}: ImageInsertModalProps) {
  const [activeTab, setActiveTab] = useState<ImageInsertTab>('url');
  const [currentImage, setCurrentImage] = useState<ImageInsertResult | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  const handleOpenCropper = useCallback((imageSrc: string) => {
    setImageToCrop(imageSrc);
    setCropperOpen(true);
  }, []);

  const handleCropSave = useCallback((croppedImage: string, shape: ImageShape) => {
    setCurrentImage({
      src: croppedImage,
      isBase64: true,
      shape,
    });
  }, []);

  const handleInsert = useCallback(() => {
    if (currentImage) {
      onInsert(currentImage);
      handleClose();
    }
  }, [currentImage, onInsert]);

  const handleClose = useCallback(() => {
    setCurrentImage(null);
    setImageToCrop(null);
    setCropperOpen(false);
    setActiveTab('url');
    onOpenChange(false);
  }, [onOpenChange]);

  const handleGallerySelect = useCallback((result: ImageInsertResult) => {
    setCurrentImage(result);
  }, []);

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Insertar imagen</DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as ImageInsertTab)}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="url" className="gap-2">
                <Link className="h-4 w-4" />
                URL
              </TabsTrigger>
              <TabsTrigger value="gallery" className="gap-2">
                <Images className="h-4 w-4" />
                Galería
              </TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="mt-4">
              <ImageUrlTab
                onImageReady={setCurrentImage}
                onOpenCropper={handleOpenCropper}
                currentImage={currentImage}
              />
            </TabsContent>

            <TabsContent value="gallery" className="mt-4">
              <ImageGalleryTab onSelect={handleGallerySelect} />
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button onClick={handleInsert} disabled={!currentImage}>
              Insertar imagen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
  );
}
