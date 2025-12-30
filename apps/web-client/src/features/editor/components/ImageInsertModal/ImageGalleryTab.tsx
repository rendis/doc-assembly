import { Images } from 'lucide-react';
import type { ImageGalleryTabProps } from './types';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function ImageGalleryTab({ onSelectImage: _onSelectImage }: ImageGalleryTabProps) {
  return (
    <div className="flex flex-col items-center justify-center h-64 bg-muted/30 rounded-lg border border-dashed">
      <Images className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-medium text-foreground mb-1">
        Galeria de imagenes
      </h3>
      <p className="text-sm text-muted-foreground text-center max-w-xs">
        Esta funcionalidad estara disponible proximamente.
        Por ahora, puedes insertar imagenes usando una URL.
      </p>
    </div>
  );
}
