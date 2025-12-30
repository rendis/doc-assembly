import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImagePlus, Trash2, Pencil } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { SignatureImageCropper } from './SignatureImageCropper';

interface SignatureImageUploadProps {
  imageData?: string;
  imageOriginal?: string;
  opacity: number;
  onImageChange: (data: string | undefined, original: string | undefined) => void;
  onOpacityChange: (opacity: number) => void;
}

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB (más grande para permitir edición)
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

export function SignatureImageUpload({
  imageData,
  imageOriginal,
  opacity,
  onImageChange,
  onOpacityChange,
}: SignatureImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validar tipo
      if (!ACCEPTED_TYPES.includes(file.type)) {
        alert('Tipo de archivo no soportado. Use PNG, JPG, GIF o WebP.');
        return;
      }

      // Validar tamaño
      if (file.size > MAX_FILE_SIZE) {
        alert('El archivo es muy grande. Máximo 2MB.');
        return;
      }

      // Convertir a base64 y abrir cropper
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setPendingImage(result);
        setCropperOpen(true);
      };
      reader.readAsDataURL(file);

      // Reset input
      event.target.value = '';
    },
    []
  );

  const handleCropperSave = useCallback(
    (croppedImage: string) => {
      // Guardar imagen procesada y original
      const original = pendingImage || imageOriginal;
      onImageChange(croppedImage, original);
      setPendingImage(null);
    },
    [pendingImage, imageOriginal, onImageChange]
  );

  const handleEdit = useCallback(() => {
    // Abrir cropper con la imagen original
    if (imageOriginal) {
      setPendingImage(imageOriginal);
      setCropperOpen(true);
    }
  }, [imageOriginal]);

  const handleRemove = useCallback(() => {
    onImageChange(undefined, undefined);
  }, [onImageChange]);

  const handleButtonClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleCropperClose = useCallback((open: boolean) => {
    setCropperOpen(open);
    if (!open) {
      setPendingImage(null);
    }
  }, []);

  return (
    <div className="space-y-3">
      <Label className="text-xs">Imagen de firma</Label>

      {/* Input oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        onChange={handleFileSelect}
        className="hidden"
      />

      {imageData ? (
        <div className="space-y-3">
          {/* Preview */}
          <div className="relative border rounded-lg p-4 bg-muted/30">
            <img
              src={imageData}
              alt="Vista previa de firma"
              className="max-h-20 max-w-full mx-auto object-contain"
              style={{
                opacity: opacity / 100,
                mixBlendMode: 'multiply',
              }}
            />

            {/* Botones de acción */}
            <div className="absolute top-1 right-1 flex gap-1">
              {imageOriginal && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={handleEdit}
                  title="Editar imagen"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={handleRemove}
                title="Eliminar imagen"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Slider de opacidad */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Opacidad</Label>
              <span className="text-xs text-muted-foreground">{opacity}%</span>
            </div>
            <Input
              type="range"
              min="10"
              max="100"
              step="5"
              value={opacity}
              onChange={(e) => onOpacityChange(parseInt(e.target.value, 10))}
              className="h-2 cursor-pointer"
            />
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleButtonClick}
        >
          <ImagePlus className="h-4 w-4 mr-2" />
          Subir imagen
        </Button>
      )}

      <p className="text-[10px] text-muted-foreground">
        PNG, JPG, GIF o WebP. Máximo 2MB.
      </p>

      {/* Cropper Modal */}
      {pendingImage && (
        <SignatureImageCropper
          open={cropperOpen}
          onOpenChange={handleCropperClose}
          imageSrc={pendingImage}
          onSave={handleCropperSave}
        />
      )}
    </div>
  );
}
