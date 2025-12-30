import { create } from 'zustand';
import { v4 as uuid } from 'uuid';
import type { SignerRoleDefinition, SignerRolesStore } from '../types/signer-roles';
import { createEmptyRole } from '../types/signer-roles';

const initialState = {
  roles: [] as SignerRoleDefinition[],
  isCollapsed: false,
};

export const useSignerRolesStore = create<SignerRolesStore>()((set, get) => ({
  ...initialState,

  setRoles: (roles) => set({ roles }),

  addRole: () => {
    const { roles } = get();
    const newOrder = roles.length + 1;
    const newRole: SignerRoleDefinition = {
      id: uuid(),
      ...createEmptyRole(newOrder),
    };
    set({ roles: [...roles, newRole] });
  },

  updateRole: (id, updates) => {
    set((state) => ({
      roles: state.roles.map((role) =>
        role.id === id ? { ...role, ...updates } : role
      ),
    }));
  },

  deleteRole: (id) => {
    set((state) => {
      const filteredRoles = state.roles.filter((role) => role.id !== id);
      // Reordenar los roles restantes
      const reorderedRoles = filteredRoles.map((role, index) => ({
        ...role,
        order: index + 1,
      }));
      return { roles: reorderedRoles };
    });
  },

  reorderRoles: (startIndex, endIndex) => {
    set((state) => {
      const roles = [...state.roles];
      const [removed] = roles.splice(startIndex, 1);
      roles.splice(endIndex, 0, removed);
      // Actualizar orden
      const reorderedRoles = roles.map((role, index) => ({
        ...role,
        order: index + 1,
      }));
      return { roles: reorderedRoles };
    });
  },

  toggleCollapsed: () => {
    set((state) => ({ isCollapsed: !state.isCollapsed }));
  },

  reset: () => set(initialState),
}));

/**
 * Selector para obtener roles ordenados
 */
export const selectOrderedRoles = (state: SignerRolesStore) =>
  [...state.roles].sort((a, b) => a.order - b.order);

/**
 * Selector para obtener un rol por ID
 */
export const selectRoleById = (state: SignerRolesStore, id: string) =>
  state.roles.find((role) => role.id === id);
