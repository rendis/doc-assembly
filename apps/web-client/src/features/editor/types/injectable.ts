import type { InjectorType, Variable } from '../data/variables';

// ============================================
// Metadata Types
// ============================================

/**
 * Metadata options for variables with format selection (DATE, TIME, MONTH)
 */
export interface FormatMetadataOptions {
  formats: string[];
  default: string;
}

/**
 * Metadata options for CURRENCY type
 */
export interface CurrencyMetadataOptions {
  currency?: string;
  locale?: string;
  decimalPlaces?: number;
  currencySymbol?: string;
  thousandsSeparator?: string;
}

/**
 * Metadata options for NUMBER type
 */
export interface NumberMetadataOptions {
  decimalPlaces?: number;
  thousandsSeparator?: string;
  decimalSeparator?: string;
}

/**
 * Union type for all metadata options
 */
export type InjectableMetadataOptions =
  | FormatMetadataOptions
  | CurrencyMetadataOptions
  | NumberMetadataOptions;

/**
 * Metadata structure from API
 */
export interface InjectableMetadata {
  options?: InjectableMetadataOptions;
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
  );
}

/**
 * Get default format from metadata
 */
export function getDefaultFormat(metadata?: InjectableMetadata): string | undefined {
  if (metadata?.options && 'default' in metadata.options) {
    return metadata.options.default;
  }
  return undefined;
}

/**
 * Get available formats from metadata
 */
export function getAvailableFormats(metadata?: InjectableMetadata): string[] {
  if (metadata?.options && 'formats' in metadata.options) {
    return metadata.options.formats;
  }
  return [];
}

// ============================================
// Injectable Types
// ============================================

/**
 * Injectable definition from API
 * Maps to: github_com_doc-assembly_doc-engine_internal_adapters_primary_http_dto.InjectableResponse
 */
export interface Injectable {
  id: string;
  workspaceId: string;
  key: string;
  label: string;
  dataType: InjectorType;
  description?: string;
  isGlobal: boolean;
  sourceType: 'INTERNAL' | 'EXTERNAL';
  metadata?: InjectableMetadata;
  createdAt: string;
  updatedAt?: string;
}

/**
 * List injectables response from API
 * Maps to: github_com_doc-assembly_doc-engine_internal_adapters_primary_http_dto.ListInjectablesResponse
 */
export interface InjectablesListResponse {
  items: Injectable[];
  total: number;
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
  };
}

/**
 * Convert array of Injectables to Variables
 */
export function mapInjectablesToVariables(injectables: Injectable[]): Variable[] {
  return injectables.map(mapInjectableToVariable);
}
