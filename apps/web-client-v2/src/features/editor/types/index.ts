export interface PageSize {
  width: number
  height: number
  label: string
}

export interface PageMargins {
  top: number
  bottom: number
  left: number
  right: number
}

export interface PageSettings {
  pageSize: PageSize
  margins: PageMargins
}

export const PAGE_SIZES: Record<string, PageSize> = {
  A4: { width: 794, height: 1123, label: 'A4' },
  LETTER: { width: 818, height: 1060, label: 'Letter' },
  LEGAL: { width: 818, height: 1404, label: 'Legal' },
  A3: { width: 1123, height: 1591, label: 'A3' },
  A5: { width: 419, height: 794, label: 'A5' },
  TABLOID: { width: 1060, height: 1635, label: 'Tabloid' },
}

export const DEFAULT_MARGINS: PageMargins = {
  top: 72,
  bottom: 72,
  left: 72,
  right: 72,
}
