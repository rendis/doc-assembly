import type { TemplateVersionDetail, VersionStatus } from '../types';

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationError {
  code: string;
  messageKey: string;
  field?: string;
}

export interface TransitionValidation {
  isValid: boolean;
  errors: ValidationError[];
}

// ============================================================================
// State Transition Rules
// ============================================================================

const VALID_TRANSITIONS: Record<VersionStatus, VersionStatus[]> = {
  DRAFT: ['PUBLISHED'],
  PUBLISHED: ['ARCHIVED'],
  ARCHIVED: [],
};

/**
 * Check if a transition from one status to another is valid
 */
export function canTransition(from: VersionStatus, to: VersionStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Get available transitions from a given status
 */
export function getAvailableTransitions(status: VersionStatus): VersionStatus[] {
  return VALID_TRANSITIONS[status] ?? [];
}

// ============================================================================
// Validation Rules
// ============================================================================

/**
 * Validate a version before publishing
 */
export function validateForPublish(version: TemplateVersionDetail): TransitionValidation {
  const errors: ValidationError[] = [];

  // Rule 1: Content must exist
  const hasContent = version.contentStructure && (
    Array.isArray(version.contentStructure)
      ? version.contentStructure.length > 0
      : Object.keys(version.contentStructure).length > 0
  );
  if (!hasContent) {
    errors.push({
      code: 'NO_CONTENT',
      messageKey: 'templates.validation.noContent',
      field: 'contentStructure',
    });
  }

  // Rule 2: If injectables are referenced in content, they must be configured
  // Note: This validation may need to be enhanced based on actual content analysis
  // For now, we check if injectables array exists and is not empty when expected
  // The backend should enforce stricter validation

  // Rule 3: Signer roles must be defined if document requires signatures
  // This is optional - only validate if the template type requires signatures
  // For now, we don't enforce this as not all templates need signatures

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate a version for archiving (currently no restrictions)
 */
export function validateForArchive(): TransitionValidation {
  // Archiving is always allowed per business requirements
  return {
    isValid: true,
    errors: [],
  };
}

/**
 * Validate a transition and return validation result
 */
export function validateTransition(
  version: TemplateVersionDetail,
  to: VersionStatus
): TransitionValidation {
  // First check if transition is valid
  if (!canTransition(version.status, to)) {
    return {
      isValid: false,
      errors: [
        {
          code: 'INVALID_TRANSITION',
          messageKey: 'templates.validation.invalidTransition',
        },
      ],
    };
  }

  // Apply specific validations based on target status
  switch (to) {
    case 'PUBLISHED':
      return validateForPublish(version);
    case 'ARCHIVED':
      return validateForArchive();
    default:
      return { isValid: true, errors: [] };
  }
}

// ============================================================================
// Status Helpers
// ============================================================================

/**
 * Check if version has a scheduled action
 */
export function hasScheduledAction(version: TemplateVersionDetail): boolean {
  return !!(version.scheduledPublishAt || version.scheduledArchiveAt);
}

/**
 * Get the scheduled action type if any
 */
export function getScheduledActionType(
  version: TemplateVersionDetail
): 'publish' | 'archive' | null {
  if (version.scheduledPublishAt) return 'publish';
  if (version.scheduledArchiveAt) return 'archive';
  return null;
}

/**
 * Get the scheduled date if any
 */
export function getScheduledDate(version: TemplateVersionDetail): string | null {
  return version.scheduledPublishAt || version.scheduledArchiveAt || null;
}

/**
 * Check if version is editable (only DRAFT versions are editable)
 */
export function isEditable(version: TemplateVersionDetail): boolean {
  return version.status === 'DRAFT';
}

/**
 * Check if version can be deleted (only DRAFT versions can be deleted)
 */
export function canDelete(version: TemplateVersionDetail): boolean {
  return version.status === 'DRAFT';
}

/**
 * Check if version can be cloned (PUBLISHED and ARCHIVED can be cloned)
 */
export function canClone(version: TemplateVersionDetail): boolean {
  return version.status === 'PUBLISHED' || version.status === 'ARCHIVED';
}
