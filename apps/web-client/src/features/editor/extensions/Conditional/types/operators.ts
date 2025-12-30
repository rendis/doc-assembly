import type { LucideIcon } from 'lucide-react';
import {
  Equal,
  EqualNot,
  ChevronRight,
  ChevronLeft,
  ChevronsRight,
  ChevronsLeft,
  Search,
  Circle,
  CircleDot,
  TextCursor,
  TextCursorInput,
  ArrowLeft,
  ArrowRight,
  Check,
  X,
} from 'lucide-react';
import type { InjectorType } from '@/features/editor/data/variables';
import type { RuleOperator } from '../ConditionalExtension';

// Operadores que NO requieren valor
export const NO_VALUE_OPERATORS: RuleOperator[] = ['empty', 'not_empty', 'is_true', 'is_false'];

// Mapeo de tipos a operadores disponibles
export const TYPE_OPERATORS: Record<InjectorType, RuleOperator[]> = {
  TEXT: ['eq', 'neq', 'starts_with', 'ends_with', 'contains', 'empty', 'not_empty'],
  NUMBER: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'empty', 'not_empty'],
  CURRENCY: ['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'empty', 'not_empty'],
  DATE: ['eq', 'neq', 'before', 'after', 'empty', 'not_empty'],
  BOOLEAN: ['eq', 'neq', 'is_true', 'is_false', 'empty', 'not_empty'],
  IMAGE: ['empty', 'not_empty'],
  TABLE: ['empty', 'not_empty'],
  ROLE_TEXT: ['eq', 'neq', 'starts_with', 'ends_with', 'contains', 'empty', 'not_empty'],
};

// Definición de operador con etiqueta e icono
export interface OperatorDefinition {
  value: RuleOperator;
  label: string;
  icon: LucideIcon;
  requiresValue: boolean;
}

// Definiciones completas de operadores
export const OPERATOR_DEFINITIONS: OperatorDefinition[] = [
  // Comunes
  { value: 'eq', label: 'es igual a', icon: Equal, requiresValue: true },
  { value: 'neq', label: 'es diferente a', icon: EqualNot, requiresValue: true },
  { value: 'empty', label: 'está vacío', icon: Circle, requiresValue: false },
  { value: 'not_empty', label: 'no está vacío', icon: CircleDot, requiresValue: false },

  // TEXT
  { value: 'contains', label: 'contiene', icon: Search, requiresValue: true },
  { value: 'starts_with', label: 'comienza con', icon: TextCursor, requiresValue: true },
  { value: 'ends_with', label: 'termina con', icon: TextCursorInput, requiresValue: true },

  // NUMBER/CURRENCY
  { value: 'gt', label: 'mayor que', icon: ChevronRight, requiresValue: true },
  { value: 'lt', label: 'menor que', icon: ChevronLeft, requiresValue: true },
  { value: 'gte', label: 'mayor o igual que', icon: ChevronsRight, requiresValue: true },
  { value: 'lte', label: 'menor o igual que', icon: ChevronsLeft, requiresValue: true },

  // DATE
  { value: 'before', label: 'está antes de', icon: ArrowLeft, requiresValue: true },
  { value: 'after', label: 'está después de', icon: ArrowRight, requiresValue: true },

  // BOOLEAN
  { value: 'is_true', label: 'es verdadero', icon: Check, requiresValue: false },
  { value: 'is_false', label: 'es falso', icon: X, requiresValue: false },
];

// Mapa para acceso rápido
const operatorMap = new Map(OPERATOR_DEFINITIONS.map((op) => [op.value, op]));

// Helper para obtener definición de operador
export const getOperatorDef = (op: RuleOperator): OperatorDefinition | undefined => operatorMap.get(op);

// Helper para verificar si operador requiere valor
export const operatorRequiresValue = (op: RuleOperator): boolean => !NO_VALUE_OPERATORS.includes(op);

// Helper para obtener operadores de un tipo
export const getOperatorsForType = (type: InjectorType): OperatorDefinition[] => {
  const ops = TYPE_OPERATORS[type] || [];
  return ops.map((op) => operatorMap.get(op)).filter((def): def is OperatorDefinition => def !== undefined);
};

// Símbolos para el resumen de fórmula
export const OPERATOR_SYMBOLS: Record<RuleOperator, string> = {
  eq: '=',
  neq: '≠',
  gt: '>',
  lt: '<',
  gte: '≥',
  lte: '≤',
  contains: '∋',
  starts_with: '^=',
  ends_with: '$=',
  empty: '∅',
  not_empty: '!∅',
  before: '<',
  after: '>',
  is_true: '= ✓',
  is_false: '= ✗',
};
