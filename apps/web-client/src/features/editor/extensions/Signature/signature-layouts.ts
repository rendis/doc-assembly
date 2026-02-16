import type {
  SignatureCount,
  SignatureLayout,
  SignatureLayoutDefinition,
  SignatureLineWidth,
} from './types'

/**
 * Definiciones de todos los layouts disponibles
 * Los campos nameKey y descriptionKey son claves de traducción i18n
 */
export const SIGNATURE_LAYOUTS: SignatureLayoutDefinition[] = [
  // 1 firma
  {
    id: 'single-left',
    nameKey: 'editor.signature.layouts.left',
    descriptionKey: 'editor.signature.layouts.leftDesc',
    count: 1,
  },
  {
    id: 'single-center',
    nameKey: 'editor.signature.layouts.center',
    descriptionKey: 'editor.signature.layouts.centerDesc',
    count: 1,
  },
  {
    id: 'single-right',
    nameKey: 'editor.signature.layouts.right',
    descriptionKey: 'editor.signature.layouts.rightDesc',
    count: 1,
  },

  // 2 firmas
  {
    id: 'dual-sides',
    nameKey: 'editor.signature.layouts.sides',
    descriptionKey: 'editor.signature.layouts.sidesDesc',
    count: 2,
  },
  {
    id: 'dual-center',
    nameKey: 'editor.signature.layouts.stackedCenter',
    descriptionKey: 'editor.signature.layouts.stackedCenterDesc',
    count: 2,
  },
  {
    id: 'dual-left',
    nameKey: 'editor.signature.layouts.stackedLeft',
    descriptionKey: 'editor.signature.layouts.stackedLeftDesc',
    count: 2,
  },
  {
    id: 'dual-right',
    nameKey: 'editor.signature.layouts.stackedRight',
    descriptionKey: 'editor.signature.layouts.stackedRightDesc',
    count: 2,
  },

  // 3 firmas
  {
    id: 'triple-row',
    nameKey: 'editor.signature.layouts.row',
    descriptionKey: 'editor.signature.layouts.rowDesc',
    count: 3,
  },
  {
    id: 'triple-pyramid',
    nameKey: 'editor.signature.layouts.invertedPyramid',
    descriptionKey: 'editor.signature.layouts.invertedPyramidDesc',
    count: 3,
  },
  {
    id: 'triple-inverted',
    nameKey: 'editor.signature.layouts.pyramid',
    descriptionKey: 'editor.signature.layouts.pyramidDesc',
    count: 3,
  },

  // 4 firmas
  {
    id: 'quad-grid',
    nameKey: 'editor.signature.layouts.grid',
    descriptionKey: 'editor.signature.layouts.gridDesc',
    count: 4,
  },
  {
    id: 'quad-top-heavy',
    nameKey: 'editor.signature.layouts.threePlusOne',
    descriptionKey: 'editor.signature.layouts.threePlusOneDesc',
    count: 4,
  },
  {
    id: 'quad-bottom-heavy',
    nameKey: 'editor.signature.layouts.onePlusThree',
    descriptionKey: 'editor.signature.layouts.onePlusThreeDesc',
    count: 4,
  },
]

/**
 * Obtiene los layouts disponibles para una cantidad de firmas
 */
export function getLayoutsForCount(
  count: SignatureCount
): SignatureLayoutDefinition[] {
  return SIGNATURE_LAYOUTS.filter((layout) => layout.count === count)
}

/**
 * Obtiene la definición de un layout por su ID
 */
export function getLayoutDefinition(
  id: SignatureLayout
): SignatureLayoutDefinition | undefined {
  return SIGNATURE_LAYOUTS.find((layout) => layout.id === id)
}

/**
 * Clases CSS para el contenedor del bloque según el layout
 */
export function getLayoutContainerClasses(layout: SignatureLayout): string {
  const baseClasses = 'w-full'

  switch (layout) {
    // 1 firma
    case 'single-left':
      return `${baseClasses} flex justify-start`
    case 'single-center':
      return `${baseClasses} flex justify-center`
    case 'single-right':
      return `${baseClasses} flex justify-end`

    // 2 firmas
    case 'dual-sides':
      return `${baseClasses} flex justify-between items-start`
    case 'dual-center':
      return `${baseClasses} flex flex-col items-center gap-8`
    case 'dual-left':
      return `${baseClasses} flex flex-col items-start gap-8`
    case 'dual-right':
      return `${baseClasses} flex flex-col items-end gap-8`

    // 3 firmas
    case 'triple-row':
      return `${baseClasses} flex justify-between items-start`
    case 'triple-pyramid':
      return `${baseClasses} flex flex-col gap-8`
    case 'triple-inverted':
      return `${baseClasses} flex flex-col gap-8`

    // 4 firmas
    case 'quad-grid':
      return `${baseClasses} grid grid-cols-2 gap-8 items-start justify-items-center`
    case 'quad-top-heavy':
      return `${baseClasses} flex flex-col gap-8`
    case 'quad-bottom-heavy':
      return `${baseClasses} flex flex-col gap-8`

    default:
      return baseClasses
  }
}

/**
 * Genera las clases para cada firma individual dentro del layout
 */
export function getSignaturePositionClasses(
  layout: SignatureLayout,
  index: number
): string {
  switch (layout) {
    // Layouts con filas especiales
    case 'triple-pyramid':
      if (index < 2) {
        return index === 0 ? 'self-start' : 'self-end'
      }
      return 'self-center'

    case 'triple-inverted':
      if (index === 0) {
        return 'self-center'
      }
      return index === 1 ? 'self-start' : 'self-end'

    case 'quad-top-heavy':
      if (index < 3) {
        return '' // Las 3 primeras en fila
      }
      return 'col-span-full flex justify-center'

    case 'quad-bottom-heavy':
      if (index === 0) {
        return 'col-span-full flex justify-center'
      }
      return '' // Las 3 restantes en fila

    default:
      return ''
  }
}

/**
 * Determina si el layout necesita un wrapper de fila para ciertas firmas
 */
export function getLayoutRowStructure(
  layout: SignatureLayout
): { rows: number[][]; rowClasses: string[] } {
  switch (layout) {
    case 'triple-pyramid':
      return {
        rows: [[0, 1], [2]],
        rowClasses: ['flex justify-between items-start', 'flex justify-center'],
      }

    case 'triple-inverted':
      return {
        rows: [[0], [1, 2]],
        rowClasses: ['flex justify-center', 'flex justify-between items-start'],
      }

    case 'quad-top-heavy':
      return {
        rows: [[0, 1, 2], [3]],
        rowClasses: ['flex justify-between items-start', 'flex justify-center'],
      }

    case 'quad-bottom-heavy':
      return {
        rows: [[0], [1, 2, 3]],
        rowClasses: ['flex justify-center', 'flex justify-between items-start'],
      }

    default:
      return { rows: [], rowClasses: [] }
  }
}

/**
 * Verifica si un layout necesita estructura de filas especial
 */
export function layoutNeedsRowStructure(layout: SignatureLayout): boolean {
  return [
    'triple-pyramid',
    'triple-inverted',
    'quad-top-heavy',
    'quad-bottom-heavy',
  ].includes(layout)
}

/**
 * Clases para el ancho de la línea de firma
 */
export function getLineWidthClasses(width: SignatureLineWidth): string {
  switch (width) {
    case 'sm':
      return 'w-24 max-w-full'
    case 'md':
      return 'w-44 max-w-full'
    case 'lg':
      return 'w-72 max-w-full'
    default:
      return 'w-44 max-w-full'
  }
}

/**
 * Clases para el contenedor de una firma individual según el count
 */
export function getSignatureItemWidthClasses(count: SignatureCount): string {
  switch (count) {
    case 1:
      return 'max-w-xs'
    case 2:
      return 'max-w-[200px]'
    case 3:
      return 'max-w-[180px]'
    case 4:
      return 'max-w-[160px]'
    default:
      return 'max-w-xs'
  }
}
