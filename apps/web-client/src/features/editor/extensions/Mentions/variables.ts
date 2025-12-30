import { Calendar, CheckSquare, Coins, Hash, Image as ImageIcon, Table, Type } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { InjectorType, Variable } from '../../data/variables';
import {
  getVariables,
  filterVariables as storeFilterVariables,
} from '../../stores/injectables-store';

// Re-export types for backward compatibility
export type VariableType = InjectorType;

export interface MentionVariable {
  id: string;
  label: string;
  type: VariableType;
}

export const VARIABLE_ICONS: Record<VariableType, LucideIcon> = {
  TEXT: Type,
  NUMBER: Hash,
  DATE: Calendar,
  CURRENCY: Coins,
  BOOLEAN: CheckSquare,
  IMAGE: ImageIcon,
  TABLE: Table,
};

/**
 * Map Variable to MentionVariable format
 */
function mapToMentionVariable(v: Variable): MentionVariable {
  return {
    id: v.variableId,
    label: v.label,
    type: v.type,
  };
}

/**
 * Get all variables as MentionVariable format (from store)
 */
export function getMentionVariables(): MentionVariable[] {
  return getVariables().map(mapToMentionVariable);
}

/**
 * Filter variables by query and return as MentionVariable format
 */
export function filterVariables(query: string): MentionVariable[] {
  const filtered = storeFilterVariables(query);
  return filtered.map(mapToMentionVariable);
}
