import type { Variable } from '../data/variables';

/**
 * Tipo de valor para un campo de rol de firma
 * - 'text': valor fijo de texto
 * - 'injectable': referencia a una variable/inyectable
 */
export type SignerRoleFieldType = 'text' | 'injectable';

/**
 * Valor de un campo de rol (nombre o email)
 */
export interface SignerRoleFieldValue {
  type: SignerRoleFieldType;
  value: string; // El texto fijo o el variableId
}

/**
 * Definición de un rol de firma
 */
export interface SignerRoleDefinition {
  id: string;
  label: string; // Nombre del rol (ej: "Cliente", "Vendedor")
  name: SignerRoleFieldValue;
  email: SignerRoleFieldValue;
  order: number;
}

/**
 * Estado del store de roles de firma
 */
export interface SignerRolesState {
  roles: SignerRoleDefinition[];
  isCollapsed: boolean;
}

/**
 * Acciones del store de roles de firma
 */
export interface SignerRolesActions {
  setRoles: (roles: SignerRoleDefinition[]) => void;
  addRole: () => void;
  updateRole: (id: string, updates: Partial<Omit<SignerRoleDefinition, 'id'>>) => void;
  deleteRole: (id: string) => void;
  reorderRoles: (startIndex: number, endIndex: number) => void;
  toggleCollapsed: () => void;
  reset: () => void;
}

/**
 * Store completo de roles de firma
 */
export type SignerRolesStore = SignerRolesState & SignerRolesActions;

/**
 * Props del contexto de roles de firma
 */
export interface SignerRolesContextValue {
  roles: SignerRoleDefinition[];
  variables: Variable[];
  getAvailableRoles: (excludeRoleId?: string) => SignerRoleDefinition[];
  getRoleById: (id: string) => SignerRoleDefinition | undefined;
  isRoleAssigned: (roleId: string, excludeSignatureId?: string) => boolean;
}

/**
 * Crea una definición de rol vacía con valores por defecto
 */
export function createEmptyRole(order: number): Omit<SignerRoleDefinition, 'id'> {
  return {
    label: `Rol ${order}`,
    name: { type: 'text', value: '' },
    email: { type: 'text', value: '' },
    order,
  };
}

/**
 * Obtiene el texto de visualización para un campo de rol
 */
export function getFieldDisplayValue(
  field: SignerRoleFieldValue,
  variables: Variable[]
): string {
  if (field.type === 'text') {
    return field.value || '(vacío)';
  }

  const variable = variables.find(v => v.variableId === field.value);
  return variable ? `{{${variable.label}}}` : `{{${field.value}}}`;
}

/**
 * Obtiene el nombre para mostrar de un rol
 */
export function getRoleDisplayName(
  role: SignerRoleDefinition,
  _variables: Variable[]
): string {
  return role.label || `Rol ${role.order}`;
}
