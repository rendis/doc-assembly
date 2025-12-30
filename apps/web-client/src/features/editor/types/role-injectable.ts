import type { InjectorType } from '../data/variables';

/**
 * Propiedades disponibles para un rol de firmante
 * Extensible para agregar más propiedades en el futuro (phone, address, title, etc.)
 */
export type RolePropertyKey = 'name' | 'email';

/**
 * Definición de una propiedad de rol
 */
export interface RolePropertyDefinition {
  key: RolePropertyKey;
  labelKey: string; // Key de traducción i18n
  defaultLabel: string; // Label por defecto (fallback)
  icon: string; // Nombre del icono Lucide
  dataType: InjectorType; // Tipo de dato para el injector
}

/**
 * Configuración de propiedades de rol disponibles
 * Para agregar nuevas propiedades, simplemente añadir aquí
 */
export const ROLE_PROPERTIES: RolePropertyDefinition[] = [
  {
    key: 'name',
    labelKey: 'editor.roleInjectables.name',
    defaultLabel: 'nombre',
    icon: 'User',
    dataType: 'TEXT',
  },
  {
    key: 'email',
    labelKey: 'editor.roleInjectables.email',
    defaultLabel: 'email',
    icon: 'Mail',
    dataType: 'TEXT',
  },
];

/**
 * Variable de rol para uso en el sidebar y mentions
 * Representa una propiedad específica de un rol de firmante
 */
export interface RoleInjectable {
  /** ID único: role_{roleId}_{propertyKey} */
  id: string;
  /** ID del rol de firmante */
  roleId: string;
  /** Label del rol: "Cliente", "Vendedor" */
  roleLabel: string;
  /** Key de la propiedad: 'name', 'email' */
  propertyKey: RolePropertyKey;
  /** Label de la propiedad: "nombre", "email" */
  propertyLabel: string;
  /** Label completo para mostrar: "Cliente.nombre" */
  label: string;
  /** ID de variable para el backend: "ROLE.Cliente.name" */
  variableId: string;
  /** Tipo de dato */
  type: InjectorType;
  /** Grupo para el menú de mentions */
  group: 'role';
}

/**
 * Genera un ID único para un role injectable
 */
export function generateRoleInjectableId(
  roleId: string,
  propertyKey: RolePropertyKey
): string {
  return `role_${roleId}_${propertyKey}`;
}

/**
 * Genera el variableId para el backend
 * Formato: ROLE.{roleLabel}.{propertyKey}
 */
export function generateRoleVariableId(
  roleLabel: string,
  propertyKey: RolePropertyKey
): string {
  // Normalizar el label (sin espacios, lowercase para consistencia)
  const normalizedLabel = roleLabel.trim().replace(/\s+/g, '_');
  return `ROLE.${normalizedLabel}.${propertyKey}`;
}

/**
 * Verifica si un variableId corresponde a un role injectable
 */
export function isRoleVariableId(variableId: string): boolean {
  return variableId.startsWith('ROLE.');
}

/**
 * Parsea un variableId de rol para obtener sus componentes
 */
export function parseRoleVariableId(variableId: string): {
  roleLabel: string;
  propertyKey: RolePropertyKey;
} | null {
  if (!isRoleVariableId(variableId)) return null;

  const parts = variableId.split('.');
  if (parts.length !== 3) return null;

  return {
    roleLabel: parts[1],
    propertyKey: parts[2] as RolePropertyKey,
  };
}
