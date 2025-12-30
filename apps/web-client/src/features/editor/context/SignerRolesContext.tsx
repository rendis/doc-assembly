/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useSignerRolesStore } from '../stores/signer-roles-store';
import type { SignerRolesContextValue } from '../types/signer-roles';
import type { Variable } from '../data/variables';

const SignerRolesContext = createContext<SignerRolesContextValue | null>(null);

interface SignerRolesProviderProps {
  children: ReactNode;
  variables: Variable[];
  /**
   * Map de roleId -> signatureId para rastrear qué roles ya están asignados
   * a firmas en el documento
   */
  assignedRoles?: Map<string, string>;
}

export function SignerRolesProvider({
  children,
  variables,
  assignedRoles = new Map(),
}: SignerRolesProviderProps) {
  // Access raw roles array (stable reference from store)
  const rawRoles = useSignerRolesStore((state) => state.roles);

  // Sort roles inside useMemo to avoid creating new array on every render
  const roles = useMemo(
    () => [...rawRoles].sort((a, b) => a.order - b.order),
    [rawRoles]
  );

  const value = useMemo<SignerRolesContextValue>(() => ({
    roles,
    variables,

    getAvailableRoles: (excludeRoleId?: string) => {
      return roles.filter((role) => {
        // Si es el rol excluido, siempre incluirlo (para edición)
        if (excludeRoleId && role.id === excludeRoleId) {
          return true;
        }
        // Verificar si ya está asignado a otra firma
        return !assignedRoles.has(role.id);
      });
    },

    getRoleById: (id: string) => {
      return roles.find((role) => role.id === id);
    },

    isRoleAssigned: (roleId: string, excludeSignatureId?: string) => {
      const assignedToSignature = assignedRoles.get(roleId);
      if (!assignedToSignature) return false;
      if (excludeSignatureId && assignedToSignature === excludeSignatureId) return false;
      return true;
    },
  }), [roles, variables, assignedRoles]);

  return (
    <SignerRolesContext.Provider value={value}>
      {children}
    </SignerRolesContext.Provider>
  );
}

export function useSignerRolesContext(): SignerRolesContextValue {
  const context = useContext(SignerRolesContext);
  if (!context) {
    throw new Error('useSignerRolesContext must be used within a SignerRolesProvider');
  }
  return context;
}

/**
 * Hook seguro que no lanza error si no hay provider
 * Útil para componentes que pueden existir fuera del contexto
 */
export function useSignerRolesContextSafe(): SignerRolesContextValue | null {
  return useContext(SignerRolesContext);
}
