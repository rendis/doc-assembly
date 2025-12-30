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

interface SignatureImageCropperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onSave: (croppedImage: string) => void;
}

export function SignatureImageCropper({
  open,
  onOpenChange,
  imageSrc,
  onSave,
}: SignatureImageCropperProps) {
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
      maxWidth: 800,
      maxHeight: 400,
      imageSmoothingQuality: 'high',
    });

    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png', 0.9);
      onSave(dataUrl);
      onOpenChange(false);
    }
  }, [onSave, onOpenChange]);

  const handleCancel = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Imagen de Firma</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Cropper Area */}
          <div className="relative bg-muted/30 rounded-lg overflow-hidden">
            <Cropper
              key={imageSrc}
              ref={cropperRef}
              src={imageSrc}
              className="h-[300px]"
              stencilProps={{
                grid: true,
              }}
            />
          </div>

          {/* Reset */}
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
