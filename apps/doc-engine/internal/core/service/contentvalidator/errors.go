// Package contentvalidator provides content structure validation for template versions.
package contentvalidator

import "strings"

// Error codes for content validation.
// These codes are returned in ValidationError.Code to identify specific validation failures.
const (
	// Parse errors
	ErrCodeInvalidJSON  = "INVALID_JSON"
	ErrCodeEmptyContent = "EMPTY_CONTENT"

	// Structure errors
	ErrCodeInvalidVersion    = "INVALID_VERSION_FORMAT"
	ErrCodeMissingMetaTitle  = "MISSING_META_TITLE"
	ErrCodeInvalidLanguage   = "INVALID_LANGUAGE"
	ErrCodeInvalidPageFormat = "INVALID_PAGE_FORMAT"
	ErrCodeInvalidPageSize   = "INVALID_PAGE_SIZE"
	ErrCodeInvalidMargins    = "INVALID_MARGINS"

	// Signer role errors
	ErrCodeEmptyRoleID            = "EMPTY_SIGNER_ROLE_ID"
	ErrCodeDuplicateRoleID        = "DUPLICATE_SIGNER_ROLE_ID"
	ErrCodeEmptyRoleLabel         = "EMPTY_SIGNER_ROLE_LABEL"
	ErrCodeInvalidRoleField       = "INVALID_ROLE_FIELD"
	ErrCodeEmptyRoleFieldValue    = "EMPTY_ROLE_FIELD_VALUE"
	ErrCodeInvalidRoleOrder       = "INVALID_ROLE_ORDER"
	ErrCodeDuplicateRoleOrder     = "DUPLICATE_ROLE_ORDER"
	ErrCodeRoleInjectableNotFound = "ROLE_INJECTABLE_NOT_FOUND"
	ErrCodeInaccessibleInjectable = "INACCESSIBLE_INJECTABLE"

	// Variable errors
	ErrCodeUnknownVariable      = "UNKNOWN_VARIABLE"
	ErrCodeInaccessibleVariable = "INACCESSIBLE_VARIABLE"
	ErrCodeOrphanedVariable     = "ORPHANED_VARIABLE"
	ErrCodeInvalidInjectorType  = "INVALID_INJECTOR_TYPE"
	ErrCodeInvalidRoleVariable  = "INVALID_ROLE_VARIABLE"
	ErrCodeInvalidRoleProperty  = "INVALID_ROLE_PROPERTY"

	// Signature errors
	ErrCodeInvalidSignatureCount   = "INVALID_SIGNATURE_COUNT"
	ErrCodeInvalidSignatureLayout  = "INVALID_SIGNATURE_LAYOUT"
	ErrCodeInvalidSignatureRoleRef = "INVALID_SIGNATURE_ROLE_REF"
	ErrCodeDuplicateSignatureRole  = "DUPLICATE_SIGNATURE_ROLE"
	ErrCodeMissingSignatureRole    = "MISSING_SIGNATURE_ROLE"
	ErrCodeInvalidLineWidth        = "INVALID_LINE_WIDTH"

	// Conditional errors
	ErrCodeInvalidConditionVar   = "UNKNOWN_VARIABLE_IN_CONDITION"
	ErrCodeInvalidOperator       = "INVALID_OPERATOR"
	ErrCodeInvalidLogicOperator  = "INVALID_LOGIC_OPERATOR"
	ErrCodeExpressionSyntax      = "EXPRESSION_SYNTAX_ERROR"
	ErrCodeMaxNestingExceeded    = "MAX_NESTING_EXCEEDED"
	ErrCodeInvalidRuleValueMode  = "INVALID_RULE_VALUE_MODE"
	ErrCodeInvalidConditionAttrs = "INVALID_CONDITION_ATTRS"

	// Workflow errors
	ErrCodeInvalidOrderMode        = "INVALID_ORDER_MODE"
	ErrCodeInvalidNotifyScope      = "INVALID_NOTIFICATION_SCOPE"
	ErrCodeInvalidRoleConfigRef    = "INVALID_ROLE_CONFIG_REF"
	ErrCodeSequentialTriggerError  = "SEQUENTIAL_TRIGGER_IN_PARALLEL"
	ErrCodeInvalidPreviousRoleMode = "INVALID_PREVIOUS_ROLE_MODE"
	ErrCodeInvalidPreviousRoleRef  = "INVALID_PREVIOUS_ROLE_REF"

	// Context errors
	ErrCodeValidationCancelled = "VALIDATION_CANCELLED"
)

// Warning codes for content validation.
// These codes are returned in ValidationWarning.Code for non-blocking issues.
const (
	WarnCodeDeprecatedVersion = "DEPRECATED_VERSION"
	WarnCodeExpressionWarning = "EXPRESSION_WARNING"
	WarnCodeUnusedVariable    = "UNUSED_VARIABLE"
	WarnCodeNoSignerRoles     = "NO_SIGNER_ROLES"
	WarnCodeNoSignatures      = "NO_SIGNATURES"
)

// sanitizeJSONError converts raw JSON parse errors to user-friendly messages.
// Removes internal implementation details like Go types.
func sanitizeJSONError(err error) string {
	if err == nil {
		return "Document structure is invalid"
	}

	errStr := err.Error()

	// Handle common JSON error patterns
	switch {
	case strings.Contains(errStr, "cannot unmarshal"):
		if strings.Contains(errStr, "cannot unmarshal array") {
			return "Expected an object but received an array"
		}
		if strings.Contains(errStr, "cannot unmarshal string") {
			return "Received a string where a different type was expected"
		}
		if strings.Contains(errStr, "cannot unmarshal number") {
			return "Received a number where a different type was expected"
		}
		if strings.Contains(errStr, "cannot unmarshal object") {
			return "Received an object where a different type was expected"
		}
		return "Invalid data type in document structure"

	case strings.Contains(errStr, "unexpected end of JSON"):
		return "Document is incomplete or truncated"

	case strings.Contains(errStr, "invalid character"):
		return "Document contains invalid characters or syntax errors"

	case strings.Contains(errStr, "looking for beginning of"):
		return "Document has an unexpected structure"

	default:
		return "Document structure is invalid"
	}
}
