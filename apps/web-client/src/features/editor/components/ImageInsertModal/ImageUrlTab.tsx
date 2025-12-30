import { useState, useCallback, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Link2, Loader2, Crop, AlertCircle } from 'lucide-react';
import type { ImageUrlTabProps, ImagePreviewState } from './types';

const URL_REGEX = /^https?:\/\/.+/i;

export function ImageUrlTab({ onImageReady, onCropRequest }: ImageUrlTabProps) {
  const [url, setUrl] = useState('');
  const [preview, setPreview] = useState<ImagePreviewState>({
    src: null,
    isLoading: false,
    error: null,
    isBase64: false,
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadImage = useCallback((imageUrl: string) => {
    if (!URL_REGEX.test(imageUrl)) {
      setPreview({
        src: null,
        isLoading: false,
        error: 'URL no valida. Debe comenzar con http:// o https://',
        isBase64: false,
      });
      return;
    }

    setPreview({
      src: null,
      isLoading: true,
      error: null,
      isBase64: false,
    });

    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      setPreview({
        src: imageUrl,
        isLoading: false,
        error: null,
        isBase64: false,
      });
      onImageReady(imageUrl, false);
    };

    img.onerror = () => {
      setPreview({
        src: null,
        isLoading: false,
        error: 'No se pudo cargar la imagen. Verifique la URL o intente con otra imagen.',
        isBase64: false,
      });
    };

    img.src = imageUrl;
  }, [onImageReady]);

  const handleUrlChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    setUrl(newUrl);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!newUrl.trim()) {
      setPreview({
        src: null,
        isLoading: false,
        error: null,
        isBase64: false,
      });
      return;
    }

    debounceRef.current = setTimeout(() => {
      loadImage(newUrl.trim());
    }, 500);
  }, [loadImage]);

  const handleCropClick = useCallback(() => {
    if (preview.src) {
      onCropRequest(preview.src);
    }
  }, [preview.src, onCropRequest]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label className="text-sm font-medium">URL de la imagen</Label>
        <div className="relative">
          <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="url"
            value={url}
            onChange={handleUrlChange}
            placeholder="https://ejemplo.com/imagen.jpg"
            className="pl-10"
          />
        </div>
      </div>

      {preview.isLoading && (
        <div className="flex items-center justify-center h-48 bg-muted/30 rounded-lg border border-dashed">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="text-sm">Cargando imagen...</span>
          </div>
        </div>
      )}

      {preview.error && (
        <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-lg border border-destructive/20">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{preview.error}</span>
        </div>
      )}

      {preview.src && !preview.isLoading && !preview.error && (
        <div className="space-y-3">
          <div className="relative bg-muted/30 rounded-lg border p-4">
            <img
              src={preview.src}
              alt="Vista previa"
              className="max-h-48 max-w-full mx-auto object-contain rounded"
            />
          </div>

          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCropClick}
            >
              <Crop className="h-4 w-4 mr-2" />
              Recortar imagen
            </Button>
          </div>
        </div>
      )}

      {!url && !preview.isLoading && !preview.error && (
        <div className="flex items-center justify-center h-48 bg-muted/30 rounded-lg border border-dashed">
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Link2 className="h-8 w-8" />
            <span className="text-sm">Ingresa una URL para ver la vista previa</span>
          </div>
        </div>
      )}
    </div>
  );
}
