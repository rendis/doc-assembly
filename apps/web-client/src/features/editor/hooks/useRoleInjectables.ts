import { useMemo, useCallback } from 'react';
import { useSignerRolesStore } from '../stores/signer-roles-store';
import {
  ROLE_PROPERTIES,
  generateRoleInjectableId,
  generateRoleVariableId,
  type RoleInjectable,
} from '../types/role-injectable';

interface UseRoleInjectablesReturn {
  /** Todas las variables de rol disponibles */
  roleInjectables: RoleInjectable[];
  /** Filtrar role injectables por query */
  filterRoleInjectables: (query: string) => RoleInjectable[];
  /** Obtener role injectable por id */
  getRoleInjectableById: (id: string) => RoleInjectable | undefined;
  /** Obtener role injectables por role id */
  getRoleInjectablesByRoleId: (roleId: string) => RoleInjectable[];
  /** Obtener role injectable por variableId */
  getRoleInjectableByVariableId: (variableId: string) => RoleInjectable | undefined;
}

/**
 * Hook para obtener y gestionar role injectables dentro de componentes React
 * Los role injectables se generan dinámicamente a partir de los roles definidos
 */
export function useRoleInjectables(): UseRoleInjectablesReturn {
  // Suscribirse al store de roles
  const roles = useSignerRolesStore((state) => state.roles);

  // Generar role injectables a partir de los roles
  const roleInjectables = useMemo<RoleInjectable[]>(() => {
    const injectables: RoleInjectable[] = [];

    for (const role of roles) {
      // Solo generar injectables si el rol tiene label
      if (!role.label?.trim()) continue;

      for (const prop of ROLE_PROPERTIES) {
        injectables.push({
          id: generateRoleInjectableId(role.id, prop.key),
          roleId: role.id,
          roleLabel: role.label,
          propertyKey: prop.key,
          propertyLabel: prop.defaultLabel,
          label: `${role.label}.${prop.defaultLabel}`,
          variableId: generateRoleVariableId(role.label, prop.key),
          type: prop.dataType,
          group: 'role',
        });
      }
    }

    return injectables;
  }, [roles]);

  const filterRoleInjectables = useCallback(
    (query: string): RoleInjectable[] => {
      if (!query.trim()) return roleInjectables;

      const lowerQuery = query.toLowerCase();
      return roleInjectables.filter(
        (ri) =>
          ri.label.toLowerCase().includes(lowerQuery) ||
          ri.roleLabel.toLowerCase().includes(lowerQuery) ||
          ri.propertyLabel.toLowerCase().includes(lowerQuery)
      );
    },
    [roleInjectables]
  );

  const getRoleInjectableById = useCallback(
    (id: string): RoleInjectable | undefined => {
      return roleInjectables.find((ri) => ri.id === id);
    },
    [roleInjectables]
  );

  const getRoleInjectablesByRoleId = useCallback(
    (roleId: string): RoleInjectable[] => {
      return roleInjectables.filter((ri) => ri.roleId === roleId);
    },
    [roleInjectables]
  );

  const getRoleInjectableByVariableId = useCallback(
    (variableId: string): RoleInjectable | undefined => {
      return roleInjectables.find((ri) => ri.variableId === variableId);
    },
    [roleInjectables]
  );

  return {
    roleInjectables,
    filterRoleInjectables,
    getRoleInjectableById,
    getRoleInjectablesByRoleId,
    getRoleInjectableByVariableId,
  };
}

// =============================================================================
// Funciones estáticas para uso fuera de componentes React
// (ej. en el sistema de Mentions)
// =============================================================================

/**
 * Genera role injectables a partir del estado actual del store
 * Para uso fuera de componentes React
 */
export function getRoleInjectables(): RoleInjectable[] {
  const roles = useSignerRolesStore.getState().roles;
  const injectables: RoleInjectable[] = [];

  for (const role of roles) {
    if (!role.label?.trim()) continue;

    for (const prop of ROLE_PROPERTIES) {
      injectables.push({
        id: generateRoleInjectableId(role.id, prop.key),
        roleId: role.id,
        roleLabel: role.label,
        propertyKey: prop.key,
        propertyLabel: prop.defaultLabel,
        label: `${role.label}.${prop.defaultLabel}`,
        variableId: generateRoleVariableId(role.label, prop.key),
        type: prop.dataType,
        group: 'role',
      });
    }
  }

  return injectables;
}

/**
 * Filtra role injectables por query
 * Para uso fuera de componentes React
 */
export function filterRoleInjectablesStatic(query: string): RoleInjectable[] {
  const injectables = getRoleInjectables();
  if (!query.trim()) return injectables;

  const lowerQuery = query.toLowerCase();
  return injectables.filter(
    (ri) =>
      ri.label.toLowerCase().includes(lowerQuery) ||
      ri.roleLabel.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Obtiene un role injectable por su id
 * Para uso fuera de componentes React
 */
export function getRoleInjectableByIdStatic(id: string): RoleInjectable | undefined {
  return getRoleInjectables().find((ri) => ri.id === id);
}

/**
 * Obtiene role injectables por roleId
 * Para uso fuera de componentes React
 */
export function getRoleInjectablesByRoleIdStatic(roleId: string): RoleInjectable[] {
  return getRoleInjectables().filter((ri) => ri.roleId === roleId);
}
