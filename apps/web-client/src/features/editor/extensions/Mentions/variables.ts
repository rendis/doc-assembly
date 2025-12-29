import { Calendar, CheckSquare, Coins, Hash, Image as ImageIcon, Table, Type } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type VariableType = 'TEXT' | 'NUMBER' | 'DATE' | 'CURRENCY' | 'BOOLEAN' | 'IMAGE' | 'TABLE';

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

// Variables del sistema - en producción esto vendría de una API
export const SYSTEM_VARIABLES: MentionVariable[] = [
  { id: 'client_name', label: 'Nombre Cliente', type: 'TEXT' },
  { id: 'client_email', label: 'Email Cliente', type: 'TEXT' },
  { id: 'client_address', label: 'Dirección Cliente', type: 'TEXT' },
  { id: 'total_amount', label: 'Monto Total', type: 'CURRENCY' },
  { id: 'discount_amount', label: 'Descuento', type: 'CURRENCY' },
  { id: 'tax_amount', label: 'Impuesto', type: 'CURRENCY' },
  { id: 'start_date', label: 'Fecha Inicio', type: 'DATE' },
  { id: 'end_date', label: 'Fecha Fin', type: 'DATE' },
  { id: 'created_date', label: 'Fecha Creación', type: 'DATE' },
  { id: 'is_renewal', label: 'Es Renovación', type: 'BOOLEAN' },
  { id: 'is_active', label: 'Está Activo', type: 'BOOLEAN' },
  { id: 'contract_number', label: 'Número Contrato', type: 'NUMBER' },
  { id: 'contract_type', label: 'Tipo Contrato', type: 'TEXT' },
];

export const filterVariables = (query: string): MentionVariable[] => {
  if (!query) return SYSTEM_VARIABLES;

  const lowerQuery = query.toLowerCase();
  return SYSTEM_VARIABLES.filter((variable) => {
    const matchesLabel = variable.label.toLowerCase().includes(lowerQuery);
    const matchesId = variable.id.toLowerCase().includes(lowerQuery);
    return matchesLabel || matchesId;
  });
};
