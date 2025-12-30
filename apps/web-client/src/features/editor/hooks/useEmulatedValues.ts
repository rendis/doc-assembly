import { useCallback } from 'react';
import { emulateValue, hasEmulator } from '../services/injectable-emulator';
import type { Variable } from '../data/variables';

interface UseEmulatedValuesReturn {
  /**
   * Obtiene el valor emulado para un variableId
   */
  getEmulatedValue: (variableId: string) => any | null;

  /**
   * Verifica si un variableId tiene emulador disponible
   */
  isEmulated: (variableId: string) => boolean;

  /**
   * Popula valores emulados para un array de variables
   * Solo incluye variables que tienen emulador disponible
   */
  populateEmulatedValues: (variables: Variable[]) => Record<string, any>;
}

/**
 * Hook para trabajar con valores emulados de inyectables de sistema
 *
 * Proporciona funciones para:
 * - Obtener valores emulados individuales
 * - Verificar si un injectable tiene emulador
 * - Poblar un objeto con todos los valores emulados de un conjunto de variables
 */
export function useEmulatedValues(): UseEmulatedValuesReturn {
  const getEmulatedValue = useCallback((variableId: string) => {
    return emulateValue(variableId);
  }, []);

  const isEmulated = useCallback((variableId: string) => {
    return hasEmulator(variableId);
  }, []);

  const populateEmulatedValues = useCallback((variables: Variable[]) => {
    const values: Record<string, any> = {};

    variables.forEach((variable) => {
      const emulatedValue = emulateValue(variable.variableId);
      if (emulatedValue !== null) {
        values[variable.variableId] = emulatedValue;
      }
    });

    return values;
  }, []);

  return {
    getEmulatedValue,
    isEmulated,
    populateEmulatedValues,
  };
}
