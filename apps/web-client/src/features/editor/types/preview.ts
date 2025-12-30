import type { InjectorType } from '../data/variables';
import type { RolePropertyKey } from './role-injectable';
import type { LogicGroup, LogicRule, RuleOperator } from '../extensions/Conditional/ConditionalExtension';

/**
 * Variable value entered by user for preview
 */
export interface VariableValue {
  variableId: string;
  value: string | number | boolean | Date | null;
  displayValue: string;
  format?: string;
}

/**
 * Variable extracted from document content
 */
export interface ExtractedVariable {
  variableId: string;
  type: InjectorType;
  format?: string | null;
  label?: string;
  isRoleVariable?: boolean;
  roleId?: string;
  roleLabel?: string;
  propertyKey?: RolePropertyKey;
}

/**
 * Variable with full metadata for input form
 */
export interface PreviewVariable extends ExtractedVariable {
  label: string;
  description?: string;
  isInternal: boolean;
  defaultValue?: string | number | boolean;
}

/**
 * State of preview values
 */
export interface PreviewState {
  values: Record<string, VariableValue>;
  isComplete: boolean;
  missingVariables: PreviewVariable[];
}

/**
 * Props for VariableInputModal
 */
export interface VariableInputModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  variables: PreviewVariable[];
  initialValues: Record<string, VariableValue>;
  onSubmit: (values: Record<string, VariableValue>) => void;
  onCancel: () => void;
}

/**
 * Props for PreviewModal
 */
export interface PreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: unknown; // TipTap JSON content
  values: Record<string, VariableValue>;
  onEditVariables: () => void;
}

/**
 * Props for DocumentPreviewRenderer
 */
export interface DocumentPreviewRendererProps {
  content: unknown; // TipTap JSON content
  values: Record<string, VariableValue>;
  className?: string;
}

/**
 * PDF export options
 */
export interface PdfExportOptions {
  filename?: string;
  format?: 'a4' | 'letter' | 'legal';
  orientation?: 'portrait' | 'landscape';
  margin?: number | { top: number; right: number; bottom: number; left: number };
  scale?: number;
}

/**
 * Result of condition evaluation
 */
export interface ConditionEvaluationResult {
  result: boolean;
  appliedRules: {
    variableId: string;
    operator: RuleOperator;
    expected: unknown;
    actual: unknown;
    passed: boolean;
  }[];
}

// Re-export conditional types for convenience
export type { LogicGroup, LogicRule, RuleOperator };
