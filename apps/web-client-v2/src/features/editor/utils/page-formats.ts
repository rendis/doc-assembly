import type { PageFormat } from '../types'

export const PAGE_FORMATS: Record<string, PageFormat> = {
  letter: {
    name: 'Letter',
    width: 816, // 8.5in at 96dpi
    height: 1056, // 11in at 96dpi
    padding: { top: 96, right: 96, bottom: 96, left: 96 },
  },
  legal: {
    name: 'Legal',
    width: 816,
    height: 1344, // 14in at 96dpi
    padding: { top: 96, right: 96, bottom: 96, left: 96 },
  },
  a4: {
    name: 'A4',
    width: 794, // 210mm at 96dpi
    height: 1123, // 297mm at 96dpi
    padding: { top: 96, right: 96, bottom: 96, left: 96 },
  },
}

export function getPageStyle(format: PageFormat): React.CSSProperties {
  return {
    width: `${format.width}px`,
    minHeight: `${format.height}px`,
    paddingTop: `${format.padding.top}px`,
    paddingRight: `${format.padding.right}px`,
    paddingBottom: `${format.padding.bottom}px`,
    paddingLeft: `${format.padding.left}px`,
  }
}
