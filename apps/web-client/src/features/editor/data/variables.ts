export type InjectorType = 'TEXT' | 'NUMBER' | 'DATE' | 'CURRENCY' | 'BOOLEAN' | 'IMAGE' | 'TABLE';

export interface Variable {
  id: string;
  variableId: string;
  label: string;
  type: InjectorType;
}

// TODO: Reemplazar con llamada API para obtener variables dinámicas del workspace
export const SYSTEM_VARIABLES: Variable[] = [
  { id: 'var_1', variableId: 'client_name', label: 'Nombre Cliente', type: 'TEXT' },
  { id: 'var_2', variableId: 'client_email', label: 'Email Cliente', type: 'TEXT' },
  { id: 'var_3', variableId: 'client_address', label: 'Dirección Cliente', type: 'TEXT' },
  { id: 'var_4', variableId: 'start_date', label: 'Fecha Inicio', type: 'DATE' },
  { id: 'var_5', variableId: 'end_date', label: 'Fecha Fin', type: 'DATE' },
  { id: 'var_6', variableId: 'created_date', label: 'Fecha Creación', type: 'DATE' },
  { id: 'var_7', variableId: 'total_amount', label: 'Monto Total', type: 'CURRENCY' },
  { id: 'var_8', variableId: 'discount_amount', label: 'Monto Descuento', type: 'CURRENCY' },
  { id: 'var_9', variableId: 'tax_amount', label: 'Monto Impuesto', type: 'CURRENCY' },
  { id: 'var_10', variableId: 'is_renewal', label: 'Es Renovación', type: 'BOOLEAN' },
  { id: 'var_11', variableId: 'is_active', label: 'Está Activo', type: 'BOOLEAN' },
  { id: 'var_12', variableId: 'contract_number', label: 'Número Contrato', type: 'NUMBER' },
  { id: 'var_13', variableId: 'contract_type', label: 'Tipo Contrato', type: 'TEXT' },
];

export const filterVariables = (query: string): Variable[] =>
  SYSTEM_VARIABLES.filter(
    (v) =>
      v.label.toLowerCase().includes(query.toLowerCase()) ||
      v.variableId.toLowerCase().includes(query.toLowerCase())
  );

export const getVariableById = (id: string): Variable | undefined =>
  SYSTEM_VARIABLES.find((v) => v.id === id || v.variableId === id);

export const getVariablesByType = (types: InjectorType[]): Variable[] =>
  SYSTEM_VARIABLES.filter((v) => types.includes(v.type));
