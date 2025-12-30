import { useEffect, useCallback } from 'react';
import {
  useInjectablesStore,
  filterVariables as storeFilterVariables,
  getVariableById as storeGetVariableById,
  getVariablesByType as storeGetVariablesByType,
} from '../stores/injectables-store';
import type { Variable, InjectorType } from '../data/variables';

interface UseInjectablesReturn {
  /** Variables in frontend format (ready for use in editor) */
  variables: Variable[];
  /** Loading state */
  isLoading: boolean;
  /** Error message if fetch failed */
  error: string | null;
  /** Total count from API */
  total: number;
  /** Refresh data from API */
  refresh: () => Promise<void>;
  /** Filter variables by query (label or variableId) */
  filterVariables: (query: string) => Variable[];
  /** Get variable by id or variableId */
  getVariableById: (id: string) => Variable | undefined;
  /** Get variables filtered by types */
  getVariablesByType: (types: InjectorType[]) => Variable[];
}

export function useInjectables(): UseInjectablesReturn {
  const { variables, isLoading, error, total, initialized, fetchInjectables } =
    useInjectablesStore();

  // Fetch on mount if not initialized
  useEffect(() => {
    if (!initialized) {
      fetchInjectables();
    }
  }, [initialized, fetchInjectables]);

  const filterVariables = useCallback(
    (query: string): Variable[] => storeFilterVariables(query),
    []
  );

  const getVariableById = useCallback(
    (id: string): Variable | undefined => storeGetVariableById(id),
    []
  );

  const getVariablesByType = useCallback(
    (types: InjectorType[]): Variable[] => storeGetVariablesByType(types),
    []
  );

  return {
    variables,
    isLoading,
    error,
    total,
    refresh: fetchInjectables,
    filterVariables,
    getVariableById,
    getVariablesByType,
  };
}
