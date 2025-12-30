import { useRef, useCallback } from 'react';
import { Cropper } from 'react-advanced-cropper';
import 'react-advanced-cropper/dist/style.css';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import type { ImageCropperProps } from './types';

const DEFAULT_MAX_WIDTH = 1200;
const DEFAULT_MAX_HEIGHT = 800;

export function ImageCropper({
  open,
  onOpenChange,
  imageSrc,
  onSave,
  maxWidth = DEFAULT_MAX_WIDTH,
  maxHeight = DEFAULT_MAX_HEIGHT,
}: ImageCropperProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cropperRef = useRef<any>(null);

  const handleReset = useCallback(() => {
    const defaultState = cropperRef.current?.getDefaultState();
    if (defaultState) {
      cropperRef.current?.setState(defaultState);
    }
  }, []);

  const handleSave = useCallback(() => {
    const canvas = cropperRef.current?.getCanvas({
      maxWidth,
      maxHeight,
      imageSmoothingQuality: 'high',
    });

    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png', 0.9);
      onSave(dataUrl);
      onOpenChange(false);
    }
  }, [onSave, onOpenChange, maxWidth, maxHeight]);

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Recortar Imagen</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative bg-muted/30 rounded-lg overflow-hidden">
            <Cropper
              key={imageSrc}
              ref={cropperRef}
              src={imageSrc}
              className="h-[350px]"
              stencilProps={{
                grid: true,
              }}
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
            >
              <RefreshCw className="h-4 w-4 mr-1" />
              Restablecer
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
