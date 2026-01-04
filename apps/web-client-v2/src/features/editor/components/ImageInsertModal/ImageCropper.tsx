import { useRef, useState, useCallback } from 'react';
import { Cropper, CropperRef, CircleStencil } from 'react-advanced-cropper';
import 'react-advanced-cropper/dist/style.css';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RotateCcw, Square, Circle } from 'lucide-react';
import type { ImageShape } from '../../extensions/Image/types';
import type { ImageCropperProps } from './types';

const MAX_WIDTH = 1200;
const MAX_HEIGHT = 800;
const PNG_QUALITY = 0.9;

export function ImageCropper({
  open,
  onOpenChange,
  imageSrc,
  onSave,
  maxWidth = MAX_WIDTH,
  maxHeight = MAX_HEIGHT,
  initialShape = 'square',
}: ImageCropperProps) {
  const cropperRef = useRef<CropperRef>(null);
  const [shape, setShape] = useState<ImageShape>(initialShape);

  const handleReset = useCallback(() => {
    cropperRef.current?.reset();
  }, []);

  const handleSave = useCallback(() => {
    const cropper = cropperRef.current;
    if (!cropper) return;

    const canvas = cropper.getCanvas({
      maxWidth,
      maxHeight,
    });

    if (!canvas) return;

    const croppedImage = canvas.toDataURL('image/png', PNG_QUALITY);
    onSave(croppedImage, shape);
    onOpenChange(false);
  }, [maxWidth, maxHeight, onSave, shape, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Recortar imagen</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-4">
          <span className="text-sm text-muted-foreground mr-2">Forma:</span>
          <Button
            variant={shape === 'square' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShape('square')}
          >
            <Square className="h-4 w-4 mr-1" />
            Cuadrado
          </Button>
          <Button
            variant={shape === 'circle' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShape('circle')}
          >
            <Circle className="h-4 w-4 mr-1" />
            Circular
          </Button>
        </div>

        <div className="relative h-[400px] bg-muted rounded-lg overflow-hidden">
          <Cropper
            ref={cropperRef}
            src={imageSrc}
            stencilComponent={shape === 'circle' ? CircleStencil : undefined}
            stencilProps={{
              grid: true,
              aspectRatio: shape === 'circle' ? 1 : undefined,
            }}
            className="h-full"
          />
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Restablecer
          </Button>
          <div className="flex-1" />
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Aplicar recorte
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
