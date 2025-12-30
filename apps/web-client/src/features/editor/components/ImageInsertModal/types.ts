export type ImageInsertTab = 'url' | 'gallery';

export interface ImageInsertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (result: ImageInsertResult) => void;
  shape?: 'square' | 'circle';
}

export interface ImageInsertResult {
  src: string;
  alt?: string;
  isBase64: boolean;
  shape?: 'square' | 'circle';
}

export interface ImageUrlTabProps {
  onImageReady: (src: string, isBase64: boolean) => void;
  onCropRequest: (src: string) => void;
  croppedImage?: ImageInsertResult | null;
}

export interface ImagePreviewState {
  src: string | null;
  isLoading: boolean;
  error: string | null;
  isBase64: boolean;
}

export interface ImageCropperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onSave: (croppedImage: string, shape: 'square' | 'circle') => void;
  maxWidth?: number;
  maxHeight?: number;
  initialShape?: 'square' | 'circle';
}

export interface ImageGalleryTabProps {
  onSelectImage: (src: string) => void;
}
