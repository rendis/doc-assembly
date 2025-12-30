// @ts-expect-error - TipTap types export issue in strict mode
import type { Editor, JSONContent } from '@tiptap/core';
import type {
  ExtractedVariable,
  PreviewVariable,
  VariableValue,
  LogicGroup,
  LogicRule,
} from '../types/preview';
import type { Injectable } from '../types/injectable';
import {
  isInternalKey,
  isInternalInjectable,
  getDefaultFormat,
  type InternalInjectableKey,
} from '../types/injectable';

// ============================================
// Internal Value Calculators
// ============================================

/**
 * Format a date according to the specified format string
 */
function formatDate(date: Date, format: string): string {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString();
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');

  // Handle common format patterns
  switch (format) {
    case 'DD/MM/YYYY':
      return `${day}/${month}/${year}`;
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'DD/MM/YYYY HH:mm':
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    case 'YYYY-MM-DD HH:mm:ss':
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
    case 'HH:mm':
      return `${hours}:${minutes}`;
    case 'HH:mm:ss':
      return `${hours}:${minutes}:${seconds}`;
    case 'hh:mm a': {
      const h = date.getHours();
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = (h % 12 || 12).toString().padStart(2, '0');
      return `${h12}:${minutes} ${ampm}`;
    }
    case 'long':
      return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    default:
      return `${day}/${month}/${year}`;
  }
}

/**
 * Get month name or number
 */
function getMonthValue(date: Date, format: string): string {
  switch (format) {
    case 'number':
      return (date.getMonth() + 1).toString();
    case 'short_name':
      return date.toLocaleDateString('es-ES', { month: 'short' });
    case 'name':
    default:
      return date.toLocaleDateString('es-ES', { month: 'long' });
  }
}

/**
 * Calculate value for internal (system) injectables
 */
export function calculateInternalValue(
  key: InternalInjectableKey,
  format?: string
): string {
  const now = new Date();

  switch (key) {
    case 'date_now':
      return formatDate(now, format || 'DD/MM/YYYY');
    case 'date_time_now':
      return formatDate(now, format || 'DD/MM/YYYY HH:mm');
    case 'time_now':
      return formatDate(now, format || 'HH:mm');
    case 'year_now':
      return now.getFullYear().toString();
    case 'month_now':
      return getMonthValue(now, format || 'number');
    case 'day_now':
      return now.getDate().toString();
    default:
      return '';
  }
}

// ============================================
// Variable Extraction
// ============================================

/**
 * Extract variables from conditional logic tree
 */
function extractVariablesFromConditions(
  node: LogicGroup | LogicRule,
  variables: ExtractedVariable[]
): void {
  if (node.type === 'rule') {
    const rule = node as LogicRule;
    if (rule.variableId) {
      variables.push({
        variableId: rule.variableId,
        type: 'TEXT', // Conditionals don't store type, default to TEXT
      });
    }
    // Also check if value references a variable
    if (rule.value?.mode === 'variable' && rule.value.value) {
      variables.push({
        variableId: rule.value.value,
        type: 'TEXT',
      });
    }
  } else {
    const group = node as LogicGroup;
    group.children?.forEach((child) =>
      extractVariablesFromConditions(child, variables)
    );
  }
}

/**
 * Extract all variables used in the document
 */
export function extractVariablesFromContent(editor: Editor): ExtractedVariable[] {
  const json = editor.getJSON();
  const variables: ExtractedVariable[] = [];

  function traverse(node: JSONContent): void {
    // Injector nodes
    if (node.type === 'injector' && node.attrs?.variableId) {
      variables.push({
        variableId: node.attrs.variableId as string,
        type: node.attrs.type || 'TEXT',
        format: node.attrs.format || null,
        label: node.attrs.label,
        isRoleVariable: node.attrs.isRoleVariable || false,
        roleId: node.attrs.roleId,
        roleLabel: node.attrs.roleLabel,
        propertyKey: node.attrs.propertyKey,
      });
    }

    // Conditional nodes - extract variables from conditions
    if (node.type === 'conditional' && node.attrs?.conditions) {
      extractVariablesFromConditions(
        node.attrs.conditions as LogicGroup,
        variables
      );
    }

    // Recurse into children
    node.content?.forEach(traverse);
  }

  traverse(json);

  // Deduplicate by variableId
  const seen = new Set<string>();
  return variables.filter((v) => {
    if (seen.has(v.variableId)) return false;
    seen.add(v.variableId);
    return true;
  });
}

/**
 * Enrich extracted variables with injectable metadata
 */
export function enrichVariablesWithMetadata(
  extracted: ExtractedVariable[],
  injectables: Injectable[]
): PreviewVariable[] {
  const injectableMap = new Map(injectables.map((i) => [i.key, i]));

  return extracted.map((v) => {
    const injectable = injectableMap.get(v.variableId);
    return {
      ...v,
      label: v.label || injectable?.label || v.variableId,
      description: injectable?.description,
      isInternal: injectable ? isInternalInjectable(injectable) : isInternalKey(v.variableId),
      defaultValue: undefined, // Could be extended to support default values
    };
  });
}

/**
 * Get variables that need user input (excludes INTERNAL)
 */
export function getMissingVariables(
  variables: PreviewVariable[],
  values: Record<string, VariableValue>
): PreviewVariable[] {
  return variables.filter((v) => {
    // Skip internal variables - they are auto-calculated
    if (v.isInternal) return false;
    // Skip if already has a value
    const existing = values[v.variableId];
    if (existing && existing.value !== null && existing.value !== '') return false;
    return true;
  });
}

/**
 * Auto-fill internal variables with calculated values
 */
export function autoFillInternalVariables(
  variables: PreviewVariable[],
  injectables: Injectable[]
): Record<string, VariableValue> {
  const values: Record<string, VariableValue> = {};
  const injectableMap = new Map(injectables.map((i) => [i.key, i]));

  for (const v of variables) {
    if (v.isInternal && isInternalKey(v.variableId)) {
      const injectable = injectableMap.get(v.variableId);
      const format = v.format || getDefaultFormat(injectable?.metadata);
      const displayValue = calculateInternalValue(
        v.variableId as InternalInjectableKey,
        format || undefined
      );

      values[v.variableId] = {
        variableId: v.variableId,
        value: displayValue,
        displayValue,
        format: format || undefined,
      };
    }
  }

  return values;
}

// ============================================
// Condition Evaluation
// ============================================

/**
 * Apply a comparison operator
 */
function applyOperator(
  operator: string,
  actual: unknown,
  expected: { mode: string; value: string },
  values: Record<string, VariableValue>
): boolean {
  // Get expected value (might be a variable reference)
  let expectedValue: unknown = expected.value;
  if (expected.mode === 'variable' && expected.value) {
    expectedValue = values[expected.value]?.value;
  }

  // Convert to comparable types
  const actualStr = String(actual ?? '');
  const expectedStr = String(expectedValue ?? '');
  const actualNum = Number(actual);
  const expectedNum = Number(expectedValue);

  switch (operator) {
    // Common operators
    case 'eq':
      return actualStr === expectedStr;
    case 'neq':
      return actualStr !== expectedStr;
    case 'empty':
      return actualStr === '' || actual === null || actual === undefined;
    case 'not_empty':
      return actualStr !== '' && actual !== null && actual !== undefined;

    // Text operators
    case 'starts_with':
      return actualStr.startsWith(expectedStr);
    case 'ends_with':
      return actualStr.endsWith(expectedStr);
    case 'contains':
      return actualStr.includes(expectedStr);

    // Number operators
    case 'gt':
      return !isNaN(actualNum) && !isNaN(expectedNum) && actualNum > expectedNum;
    case 'gte':
      return !isNaN(actualNum) && !isNaN(expectedNum) && actualNum >= expectedNum;
    case 'lt':
      return !isNaN(actualNum) && !isNaN(expectedNum) && actualNum < expectedNum;
    case 'lte':
      return !isNaN(actualNum) && !isNaN(expectedNum) && actualNum <= expectedNum;

    // Date operators (compare as strings in ISO format or timestamps)
    case 'before': {
      const actualDate = new Date(actualStr);
      const expectedDate = new Date(expectedStr);
      return actualDate < expectedDate;
    }
    case 'after': {
      const actualDate = new Date(actualStr);
      const expectedDate = new Date(expectedStr);
      return actualDate > expectedDate;
    }

    // Boolean operators
    case 'is_true':
      return actual === true || actualStr === 'true' || actualStr === '1';
    case 'is_false':
      return actual === false || actualStr === 'false' || actualStr === '0' || actualStr === '';

    default:
      return false;
  }
}

/**
 * Evaluate a conditional logic tree
 */
export function evaluateCondition(
  node: LogicGroup | LogicRule,
  values: Record<string, VariableValue>
): boolean {
  if (node.type === 'rule') {
    const rule = node as LogicRule;
    if (!rule.variableId) return true; // Empty rule = always true

    const varValue = values[rule.variableId]?.value;
    return applyOperator(rule.operator, varValue, rule.value, values);
  }

  // It's a group
  const group = node as LogicGroup;
  if (!group.children || group.children.length === 0) {
    return true; // Empty group = always visible
  }

  const results = group.children.map((child) => evaluateCondition(child, values));

  return group.logic === 'AND'
    ? results.every(Boolean)
    : results.some(Boolean);
}

// ============================================
// Content Transformation
// ============================================

/**
 * Transform document content for preview by replacing variable values
 * and evaluating conditionals
 */
export function transformContentForPreview(
  content: JSONContent,
  values: Record<string, VariableValue>
): JSONContent {
  function transform(node: JSONContent): JSONContent | null {
    // Handle conditional nodes
    if (node.type === 'conditional') {
      const conditions = node.attrs?.conditions as LogicGroup;
      const shouldShow = evaluateCondition(conditions, values);

      if (!shouldShow) {
        return null; // Remove this node
      }

      // Keep the conditional content but transform children
      return {
        ...node,
        content: node.content
          ?.map((child: JSONContent) => transform(child))
          .filter((n: JSONContent | null): n is JSONContent => n !== null),
      };
    }

    // Handle injector nodes - replace with resolved value
    if (node.type === 'injector' && node.attrs?.variableId) {
      const variableId = node.attrs.variableId as string;
      const varValue = values[variableId];

      return {
        ...node,
        attrs: {
          ...node.attrs,
          resolvedValue: varValue?.displayValue || `[${variableId}]`,
          hasValue: !!varValue?.value,
        },
      };
    }

    // Recurse into children
    if (node.content) {
      return {
        ...node,
        content: node.content
          .map((child: JSONContent) => transform(child))
          .filter((n: JSONContent | null): n is JSONContent => n !== null),
      };
    }

    return node;
  }

  return transform(content) || content;
}

// ============================================
// Preview State Management
// ============================================

/**
 * Create initial preview state from editor and injectables
 */
export function createPreviewState(
  editor: Editor,
  injectables: Injectable[]
): {
  variables: PreviewVariable[];
  initialValues: Record<string, VariableValue>;
  missingVariables: PreviewVariable[];
} {
  const extracted = extractVariablesFromContent(editor);
  const variables = enrichVariablesWithMetadata(extracted, injectables);
  const initialValues = autoFillInternalVariables(variables, injectables);
  const missingVariables = getMissingVariables(variables, initialValues);

  return {
    variables,
    initialValues,
    missingVariables,
  };
}
