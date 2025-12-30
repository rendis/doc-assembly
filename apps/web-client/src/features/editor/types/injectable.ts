import type { InjectorType, Variable } from '../data/variables';

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
  metadata?: Record<string, unknown>;
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
  };
}

/**
 * Convert array of Injectables to Variables
 */
export function mapInjectablesToVariables(injectables: Injectable[]): Variable[] {
  return injectables.map(mapInjectableToVariable);
}
