import { create } from 'zustand'
import type { Variable } from '../types/variables'
import type { Injectable } from '../types/injectable'
import { mapInjectablesToVariables } from '../types/injectable'

interface InjectablesState {
  // State
  variables: Variable[]
  injectables: Injectable[]
  isLoading: boolean
  error: string | null
  // Deduplication tracking
  lastFetchedWorkspaceId: string | null
  fetchPromise: Promise<void> | null

  // Actions
  setInjectables: (injectables: Injectable[]) => void
  setVariables: (variables: Variable[]) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setLastFetchedWorkspaceId: (id: string | null) => void
  setFetchPromise: (promise: Promise<void> | null) => void
  reset: () => void
}

const initialState = {
  variables: [] as Variable[],
  injectables: [] as Injectable[],
  isLoading: false,
  error: null as string | null,
  lastFetchedWorkspaceId: null as string | null,
  fetchPromise: null as Promise<void> | null,
}

export const useInjectablesStore = create<InjectablesState>()((set) => ({
  ...initialState,

  setInjectables: (injectables) => {
    const variables = mapInjectablesToVariables(injectables)
    set({ injectables, variables })
  },

  setVariables: (variables) => {
    set({ variables })
  },

  setLoading: (isLoading) => {
    set({ isLoading })
  },

  setError: (error) => {
    set({ error })
  },

  setLastFetchedWorkspaceId: (lastFetchedWorkspaceId) => {
    set({ lastFetchedWorkspaceId })
  },

  setFetchPromise: (fetchPromise) => {
    set({ fetchPromise })
  },

  reset: () => set(initialState),
}))

/**
 * Selector para obtener variables por tipo
 */
export const selectVariablesByType = (
  state: InjectablesState,
  type: Variable['type']
) => state.variables.filter((v) => v.type === type)

/**
 * Selector para buscar variables por query
 */
export const selectVariablesByQuery = (
  state: InjectablesState,
  query: string
) => {
  const lowerQuery = query.toLowerCase()
  return state.variables.filter(
    (v) =>
      v.label.toLowerCase().includes(lowerQuery) ||
      v.variableId.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Selector para obtener una variable por ID
 */
export const selectVariableById = (state: InjectablesState, id: string) =>
  state.variables.find((v) => v.id === id)

/**
 * Selector para obtener una variable por variableId
 */
export const selectVariableByVariableId = (
  state: InjectablesState,
  variableId: string
) => state.variables.find((v) => v.variableId === variableId)

// =============================================================================
// Funciones estáticas para uso fuera de componentes React
// (ej. en el sistema de Mentions)
// =============================================================================

/**
 * Get variables from store (for use outside React components)
 */
export function getVariables(): Variable[] {
  return useInjectablesStore.getState().variables
}

/**
 * Filter variables by query (for use outside React components)
 */
export function filterVariables(query: string): Variable[] {
  const variables = useInjectablesStore.getState().variables
  if (!query.trim()) return variables

  const lowerQuery = query.toLowerCase()
  return variables.filter(
    (v) =>
      v.label.toLowerCase().includes(lowerQuery) ||
      v.variableId.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Get variable by id or variableId (for use outside React components)
 */
export function getVariableById(id: string): Variable | undefined {
  const variables = useInjectablesStore.getState().variables
  return variables.find((v) => v.id === id || v.variableId === id)
}
