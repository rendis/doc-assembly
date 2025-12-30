import type { TemplateVersion, VersionStatus } from '../types';

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
 * Validate a version before publishing.
 * Note: Content validation (contentStructure) is delegated to the backend.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function validateForPublish(_version: TemplateVersion): TransitionValidation {
  // All content validation is now handled by the backend.
  // The frontend allows the publish action and the backend will validate.
  return {
    isValid: true,
    errors: [],
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
  version: TemplateVersion,
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
export function hasScheduledAction(version: TemplateVersion): boolean {
  return !!(version.scheduledPublishAt || version.scheduledArchiveAt);
}

/**
 * Get the scheduled action type if any
 */
export function getScheduledActionType(
  version: TemplateVersion
): 'publish' | 'archive' | null {
  if (version.scheduledPublishAt) return 'publish';
  if (version.scheduledArchiveAt) return 'archive';
  return null;
}

/**
 * Get the scheduled date if any
 */
export function getScheduledDate(version: TemplateVersion): string | null {
  return version.scheduledPublishAt || version.scheduledArchiveAt || null;
}

/**
 * Check if version is editable (only DRAFT versions are editable)
 */
export function isEditable(version: TemplateVersion): boolean {
  return version.status === 'DRAFT';
}

/**
 * Check if version can be deleted (only DRAFT versions can be deleted)
 */
export function canDelete(version: TemplateVersion): boolean {
  return version.status === 'DRAFT';
}

/**
 * Check if version can be cloned (PUBLISHED and ARCHIVED can be cloned)
 */
export function canClone(version: TemplateVersion): boolean {
  return version.status === 'PUBLISHED' || version.status === 'ARCHIVED';
}
