import { create } from 'zustand';
import { injectablesApi } from '../api/injectables-api';
import { mapInjectablesToVariables, isInternalInjectable } from '../types/injectable';
import type { Injectable } from '../types/injectable';
import type { Variable, InjectorType } from '../data/variables';

interface InjectablesStore {
  /** Variables in frontend format */
  variables: Variable[];
  /** Raw injectables from API */
  injectables: Injectable[];
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
  /** Total count */
  total: number;
  /** Has been fetched at least once */
  initialized: boolean;

  /** Fetch injectables from API */
  fetchInjectables: () => Promise<void>;
  /** Set variables directly (for testing) */
  setVariables: (variables: Variable[]) => void;
  /** Clear store */
  clear: () => void;
}

export const useInjectablesStore = create<InjectablesStore>((set, get) => ({
  variables: [],
  injectables: [],
  isLoading: false,
  error: null,
  total: 0,
  initialized: false,

  fetchInjectables: async () => {
    // Skip if already loading
    if (get().isLoading) return;

    set({ isLoading: true, error: null });

    try {
      const response = await injectablesApi.list();
      set({
        injectables: response.items,
        variables: mapInjectablesToVariables(response.items),
        total: response.total,
        isLoading: false,
        initialized: true,
      });
    } catch (err) {
      console.error('Failed to fetch injectables:', err);
      set({
        error: 'Error al cargar las variables',
        isLoading: false,
        initialized: true,
      });
    }
  },

  setVariables: (variables) => set({ variables, initialized: true }),

  clear: () =>
    set({
      variables: [],
      injectables: [],
      isLoading: false,
      error: null,
      total: 0,
      initialized: false,
    }),
}));

/**
 * Get variables from store (for use outside React components)
 */
export function getVariables(): Variable[] {
  return useInjectablesStore.getState().variables;
}

/**
 * Filter variables by query (for use outside React components)
 */
export function filterVariables(query: string): Variable[] {
  const variables = useInjectablesStore.getState().variables;
  if (!query.trim()) return variables;

  const lowerQuery = query.toLowerCase();
  return variables.filter(
    (v) =>
      v.label.toLowerCase().includes(lowerQuery) ||
      v.variableId.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get variable by id or variableId (for use outside React components)
 */
export function getVariableById(id: string): Variable | undefined {
  const variables = useInjectablesStore.getState().variables;
  return variables.find((v) => v.id === id || v.variableId === id);
}

/**
 * Get variables filtered by types (for use outside React components)
 */
export function getVariablesByType(types: InjectorType[]): Variable[] {
  const variables = useInjectablesStore.getState().variables;
  return variables.filter((v) => types.includes(v.type));
}

/**
 * Get all injectables (raw API format, for use outside React components)
 */
export function getInjectables(): Injectable[] {
  return useInjectablesStore.getState().injectables;
}

/**
 * Get internal (system-calculated) injectables
 */
export function getInternalInjectables(): Injectable[] {
  return useInjectablesStore.getState().injectables.filter(isInternalInjectable);
}

/**
 * Get external (user-provided) injectables
 */
export function getExternalInjectables(): Injectable[] {
  return useInjectablesStore.getState().injectables.filter(
    (inj) => !isInternalInjectable(inj)
  );
}
