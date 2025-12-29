import { Calendar, CheckSquare, Coins, Hash, Image as ImageIcon, Table, Type } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SYSTEM_VARIABLES as BASE_VARIABLES, filterVariables as baseFilterVariables, type Variable, type InjectorType } from '../../data/variables';

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

// Map from centralized variables to MentionVariable format
export const SYSTEM_VARIABLES: MentionVariable[] = BASE_VARIABLES.map((v: Variable) => ({
  id: v.variableId,
  label: v.label,
  type: v.type,
}));

export const filterVariables = (query: string): MentionVariable[] => {
  if (!query) return SYSTEM_VARIABLES;

  const filtered = baseFilterVariables(query);
  return filtered.map((v: Variable) => ({
    id: v.variableId,
    label: v.label,
    type: v.type,
  }));
};
