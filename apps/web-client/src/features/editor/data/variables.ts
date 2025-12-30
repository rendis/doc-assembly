import type { InjectableMetadata } from '../types/injectable';

/**
 * Injectable variable types supported by the editor
 * ROLE_TEXT: Variables de roles de firmantes (nombre, email, etc.)
 */
export type InjectorType =
  | 'TEXT'
  | 'NUMBER'
  | 'DATE'
  | 'CURRENCY'
  | 'BOOLEAN'
  | 'IMAGE'
  | 'TABLE'
  | 'ROLE_TEXT';

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
  metadata?: InjectableMetadata;
}
