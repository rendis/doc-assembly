import type { ImageShape } from '../../extensions/Image/types';

export type ImageInsertTab = 'url' | 'gallery';

export interface ImageInsertResult {
  src: string;
  alt?: string;
  isBase64: boolean;
  shape?: ImageShape;
}

export interface ImagePreviewState {
  src: string | null;
  isLoading: boolean;
  error: string | null;
  isBase64: boolean;
}

export interface ImageInsertModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsert: (result: ImageInsertResult) => void;
  initialShape?: ImageShape;
}

export interface ImageUrlTabProps {
  onImageReady: (result: ImageInsertResult | null) => void;
  onOpenCropper: (imageSrc: string) => void;
  currentImage: ImageInsertResult | null;
}

export interface ImageCropperProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageSrc: string;
  onSave: (croppedImage: string, shape: ImageShape) => void;
  maxWidth?: number;
  maxHeight?: number;
  initialShape?: ImageShape;
}

export interface ImageGalleryTabProps {
  onSelect: (result: ImageInsertResult) => void;
}
