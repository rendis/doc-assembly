import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ImagePlus, Trash2 } from 'lucide-react';
import { useCallback, useRef } from 'react';

interface SignatureImageUploadProps {
  imageData?: string;
  opacity: number;
  onImageChange: (data: string | undefined) => void;
  onOpacityChange: (opacity: number) => void;
}

const MAX_FILE_SIZE = 500 * 1024; // 500KB
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

export function SignatureImageUpload({
  imageData,
  opacity,
  onImageChange,
  onOpacityChange,
}: SignatureImageUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        alert('El archivo es muy grande. Máximo 500KB.');
        return;
      }

      // Convertir a base64
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        onImageChange(result);
      };
      reader.readAsDataURL(file);

      // Reset input
      event.target.value = '';
    },
    [onImageChange]
  );

  const handleRemove = useCallback(() => {
    onImageChange(undefined);
  }, [onImageChange]);

  const handleButtonClick = useCallback(() => {
    fileInputRef.current?.click();
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

            {/* Botón eliminar */}
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1 h-6 w-6 text-muted-foreground hover:text-destructive"
              onClick={handleRemove}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
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
        PNG, JPG, GIF o WebP. Máximo 500KB.
      </p>
    </div>
  );
}
