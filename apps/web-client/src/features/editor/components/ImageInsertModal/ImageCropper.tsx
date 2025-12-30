import { useRef, useCallback, useState } from 'react';
import { Cropper, CircleStencil } from 'react-advanced-cropper';
import 'react-advanced-cropper/dist/style.css';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RefreshCw, Square, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
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
  initialShape = 'square',
}: ImageCropperProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cropperRef = useRef<any>(null);
  const [shape, setShape] = useState<'square' | 'circle'>(initialShape);

  const handleReset = useCallback(() => {
    const defaultState = cropperRef.current?.getDefaultState();
    if (defaultState) {
      cropperRef.current?.setState(defaultState);
    }
  }, []);

  const handleSave = useCallback(() => {
    const canvas = cropperRef.current?.getCanvas({
      maxWidth: shape === 'circle' ? Math.min(maxWidth, maxHeight) : maxWidth,
      maxHeight: shape === 'circle' ? Math.min(maxWidth, maxHeight) : maxHeight,
      imageSmoothingQuality: 'high',
    });

    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png', 0.9);
      onSave(dataUrl, shape);
      onOpenChange(false);
    }
  }, [onSave, onOpenChange, maxWidth, maxHeight, shape]);

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
          {/* Shape selector */}
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm text-muted-foreground mr-2">Forma:</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                'gap-2',
                shape === 'square' && 'bg-accent text-accent-foreground border-primary'
              )}
              onClick={() => setShape('square')}
            >
              <Square className="h-4 w-4" />
              Cuadrada
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                'gap-2',
                shape === 'circle' && 'bg-accent text-accent-foreground border-primary'
              )}
              onClick={() => setShape('circle')}
            >
              <Circle className="h-4 w-4" />
              Circular
            </Button>
          </div>

          <div className="relative bg-muted/30 rounded-lg overflow-hidden">
            <Cropper
              key={`${imageSrc}-${shape}`}
              ref={cropperRef}
              src={imageSrc}
              className="h-[350px]"
              stencilComponent={shape === 'circle' ? CircleStencil : undefined}
              stencilProps={{
                grid: true,
                aspectRatio: shape === 'circle' ? 1 : undefined,
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
