import type { InjectorType, Variable } from './variables'

// ============================================
// Internal Injectable Constants
// ============================================

/**
 * Keys for system-calculated injectables (sourceType='INTERNAL')
 * These can be auto-filled during preview
 */
export const INTERNAL_INJECTABLE_KEYS = [
  'date_time_now',
  'date_now',
  'time_now',
  'year_now',
  'month_now',
  'day_now',
] as const

export type InternalInjectableKey = (typeof INTERNAL_INJECTABLE_KEYS)[number]

/**
 * Check if a key is an internal (auto-calculable) injectable
 */
export function isInternalKey(key: string): key is InternalInjectableKey {
  return INTERNAL_INJECTABLE_KEYS.includes(key as InternalInjectableKey)
}

// ============================================
// Metadata Types
// ============================================

/**
 * Metadata options for variables with format selection (DATE, TIME, MONTH)
 */
export interface FormatMetadataOptions {
  formats: string[]
  default: string
}

/**
 * Metadata options for CURRENCY type
 */
export interface CurrencyMetadataOptions {
  currency?: string
  locale?: string
  decimalPlaces?: number
  currencySymbol?: string
  thousandsSeparator?: string
}

/**
 * Metadata options for NUMBER type
 */
export interface NumberMetadataOptions {
  decimalPlaces?: number
  thousandsSeparator?: string
  decimalSeparator?: string
}

/**
 * Union type for all metadata options
 */
export type InjectableMetadataOptions =
  | FormatMetadataOptions
  | CurrencyMetadataOptions
  | NumberMetadataOptions

/**
 * Metadata structure from API
 */
export interface InjectableMetadata {
  options?: InjectableMetadataOptions
}

// ============================================
// Metadata Helper Functions
// ============================================

/**
 * Check if metadata has configurable format options
 */
export function hasConfigurableOptions(metadata?: InjectableMetadata): boolean {
  return Boolean(
    metadata?.options &&
      'formats' in metadata.options &&
      Array.isArray(metadata.options.formats) &&
      metadata.options.formats.length > 1
  )
}

/**
 * Get default format from metadata
 */
export function getDefaultFormat(
  metadata?: InjectableMetadata
): string | undefined {
  if (metadata?.options && 'default' in metadata.options) {
    return metadata.options.default
  }
  return undefined
}

/**
 * Get available formats from metadata
 */
export function getAvailableFormats(metadata?: InjectableMetadata): string[] {
  if (metadata?.options && 'formats' in metadata.options) {
    return metadata.options.formats
  }
  return []
}

// ============================================
// Injectable Types
// ============================================

/**
 * Injectable definition from API
 */
export interface Injectable {
  id: string
  workspaceId: string
  key: string
  label: string
  dataType: InjectorType
  description?: string
  isGlobal: boolean
  sourceType: 'INTERNAL' | 'EXTERNAL'
  metadata?: InjectableMetadata
  createdAt: string
  updatedAt?: string
}

/**
 * List injectables response from API
 */
export interface InjectablesListResponse {
  items: Injectable[]
  total: number
}

/**
 * Convert API Injectable to frontend Variable format
 */
export function mapInjectableToVariable(injectable: Injectable): Variable {
  return {
    id: injectable.id,
    variableId: injectable.key,
    label: injectable.label,
    type: injectable.dataType,
    description: injectable.description,
    metadata: injectable.metadata,
  }
}

/**
 * Convert array of Injectables to Variables
 */
export function mapInjectablesToVariables(injectables: Injectable[]): Variable[] {
  return injectables.map(mapInjectableToVariable)
}

/**
 * Check if an injectable is internal (system-calculated)
 */
export function isInternalInjectable(injectable: Injectable): boolean {
  return injectable.sourceType === 'INTERNAL'
}
