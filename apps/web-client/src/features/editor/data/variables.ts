/**
 * Injectable variable types supported by the editor
 */
export type InjectorType = 'TEXT' | 'NUMBER' | 'DATE' | 'CURRENCY' | 'BOOLEAN' | 'IMAGE' | 'TABLE';

/**
 * Variable interface for frontend usage
 * Variables are fetched from API via useInjectables hook or injectables-store
 */
export interface Variable {
  id: string;
  variableId: string;
  label: string;
  type: InjectorType;
  description?: string;
}
