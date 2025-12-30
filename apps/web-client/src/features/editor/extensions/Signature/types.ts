/**
 * Tipos para el componente de firma multi-layout
 */

/**
 * Cantidad de firmas permitidas en un bloque
 */
export type SignatureCount = 1 | 2 | 3 | 4;

/**
 * Ancho de la línea de firma
 */
export type SignatureLineWidth = 'sm' | 'md' | 'lg';

/**
 * Layouts disponibles para 1 firma
 */
export type SingleSignatureLayout = 'single-left' | 'single-center' | 'single-right';

/**
 * Layouts disponibles para 2 firmas
 */
export type DualSignatureLayout = 'dual-sides' | 'dual-center' | 'dual-left' | 'dual-right';

/**
 * Layouts disponibles para 3 firmas
 */
export type TripleSignatureLayout = 'triple-row' | 'triple-pyramid' | 'triple-inverted';

/**
 * Layouts disponibles para 4 firmas
 */
export type QuadSignatureLayout = 'quad-grid' | 'quad-top-heavy' | 'quad-bottom-heavy';

/**
 * Todos los layouts posibles
 */
export type SignatureLayout =
  | SingleSignatureLayout
  | DualSignatureLayout
  | TripleSignatureLayout
  | QuadSignatureLayout;

/**
 * Una firma individual dentro del bloque
 */
export interface SignatureItem {
  id: string;
  roleId?: string;
  label: string;
  subtitle?: string;
  imageData?: string; // Imagen procesada (cropped) - Base64
  imageOriginal?: string; // Imagen original para re-editar - Base64
  imageOpacity?: number; // 0-100, default 100
  imageRotation?: number; // Rotación en grados (0, 90, 180, 270)
  imageScale?: number; // Escala (1 = 100%)
  imageX?: number; // Offset X en px
  imageY?: number; // Offset Y en px
}

/**
 * Atributos del nodo Signature en TipTap
 */
export interface SignatureBlockAttrs {
  count: SignatureCount;
  layout: SignatureLayout;
  signatures: SignatureItem[];
  lineWidth: SignatureLineWidth;
}

/**
 * Definición de un layout con su metadata
 */
export interface SignatureLayoutDefinition {
  id: SignatureLayout;
  name: string;
  description: string;
  count: SignatureCount;
  icon?: string;
}

/**
 * Props para el componente de firma individual
 */
export interface SignatureItemProps {
  signature: SignatureItem;
  lineWidth: SignatureLineWidth;
  showRoleBadge?: boolean;
  className?: string;
}

/**
 * Props para el selector de layouts
 */
export interface SignatureLayoutSelectorProps {
  count: SignatureCount;
  value: SignatureLayout;
  onChange: (layout: SignatureLayout) => void;
}

/**
 * Props para el editor de imagen de firma
 */
export interface SignatureImageUploadProps {
  imageData?: string;
  opacity: number;
  onImageChange: (data: string | undefined) => void;
  onOpacityChange: (opacity: number) => void;
}

/**
 * Crea un item de firma vacío
 */
export function createEmptySignatureItem(index: number): SignatureItem {
  return {
    id: `sig_${Date.now()}_${index}`,
    label: `Firma ${index + 1}`,
    subtitle: '',
    imageOpacity: 100,
  };
}

/**
 * Crea atributos por defecto para un bloque de firma
 */
export function createDefaultSignatureAttrs(): SignatureBlockAttrs {
  return {
    count: 1,
    layout: 'single-center',
    signatures: [createEmptySignatureItem(0)],
    lineWidth: 'md',
  };
}

/**
 * Obtiene el layout por defecto para una cantidad de firmas
 */
export function getDefaultLayoutForCount(count: SignatureCount): SignatureLayout {
  switch (count) {
    case 1:
      return 'single-center';
    case 2:
      return 'dual-sides';
    case 3:
      return 'triple-row';
    case 4:
      return 'quad-grid';
  }
}

/**
 * Ajusta el array de signatures al nuevo count
 */
export function adjustSignaturesToCount(
  signatures: SignatureItem[],
  count: SignatureCount
): SignatureItem[] {
  if (signatures.length === count) {
    return signatures;
  }

  if (signatures.length > count) {
    return signatures.slice(0, count);
  }

  const newSignatures = [...signatures];
  while (newSignatures.length < count) {
    newSignatures.push(createEmptySignatureItem(newSignatures.length));
  }
  return newSignatures;
}
