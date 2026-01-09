package entity

import "errors"

// Authentication and Authorization errors.
var (
	ErrUnauthorized     = errors.New("unauthorized")
	ErrForbidden        = errors.New("access denied")
	ErrInvalidToken     = errors.New("invalid token")
	ErrTokenExpired     = errors.New("token expired")
	ErrMissingToken     = errors.New("missing authorization token")
	ErrInsufficientRole = errors.New("insufficient role permissions")
)

// Context errors.
var (
	ErrMissingWorkspaceID = errors.New("missing workspace ID")
	ErrMissingTenantID    = errors.New("missing tenant ID")
	ErrMissingUserID      = errors.New("missing user ID")
	ErrInvalidWorkspaceID = errors.New("invalid workspace ID format")
	ErrInvalidTenantID    = errors.New("invalid tenant ID format")
	ErrInvalidUserID      = errors.New("invalid user ID format")
)

// System Role errors.
var (
	ErrSystemRoleNotFound = errors.New("system role not found")
	ErrSystemRoleExists   = errors.New("user already has a system role")
	ErrInvalidSystemRole  = errors.New("invalid system role")
)

// Tenant Member errors.
var (
	ErrTenantMemberNotFound    = errors.New("tenant member not found")
	ErrTenantMemberExists      = errors.New("user is already a member of this tenant")
	ErrTenantAccessDenied      = errors.New("tenant access denied")
	ErrInvalidTenantRole       = errors.New("invalid tenant role")
	ErrCannotRemoveTenantOwner = errors.New("cannot remove tenant owner")
)

// Tenant errors.
var (
	ErrTenantNotFound      = errors.New("tenant not found")
	ErrTenantAlreadyExists = errors.New("tenant already exists")
	ErrInvalidTenantCode   = errors.New("invalid tenant code")
)

// Workspace errors.
var (
	ErrWorkspaceNotFound      = errors.New("workspace not found")
	ErrWorkspaceAlreadyExists = errors.New("workspace already exists")
	ErrWorkspaceAccessDenied  = errors.New("workspace access denied")
	ErrWorkspaceSuspended     = errors.New("workspace is suspended")
	ErrWorkspaceArchived      = errors.New("workspace is archived")
	ErrSystemWorkspaceExists  = errors.New("system workspace already exists for this tenant")
	ErrGlobalWorkspaceExists  = errors.New("global system workspace already exists")
	ErrInvalidWorkspaceType   = errors.New("invalid workspace type")
	ErrInvalidWorkspaceStatus = errors.New("invalid workspace status")
	ErrCannotArchiveSystem    = errors.New("cannot archive system workspace")
	ErrSandboxNotFound        = errors.New("sandbox workspace not found")
	ErrSandboxNotSupported    = errors.New("this workspace type does not support sandbox mode")
	ErrCannotPromoteToSandbox = errors.New("cannot promote to a sandbox workspace")
)

// User errors.
var (
	ErrUserNotFound      = errors.New("user not found")
	ErrUserAlreadyExists = errors.New("user already exists")
	ErrUserSuspended     = errors.New("user is suspended")
	ErrUserNotInvited    = errors.New("user has not been invited to the system")
	ErrInvalidUserStatus = errors.New("invalid user status")
	ErrEmailAlreadyInUse = errors.New("email already in use")
	ErrInvalidEmail      = errors.New("invalid email format")
)

// Workspace Member errors.
var (
	ErrMemberNotFound          = errors.New("workspace member not found")
	ErrMemberAlreadyExists     = errors.New("user is already a member of this workspace")
	ErrMembershipPending       = errors.New("membership is pending")
	ErrCannotRemoveOwner       = errors.New("cannot remove workspace owner")
	ErrInvalidRole             = errors.New("invalid workspace role")
	ErrInvalidMembershipStatus = errors.New("invalid membership status")
)

// Folder errors.
var (
	ErrFolderNotFound      = errors.New("folder not found")
	ErrFolderAlreadyExists = errors.New("folder with this name already exists")
	ErrFolderHasChildren   = errors.New("folder has child folders")
	ErrFolderHasTemplates  = errors.New("folder contains templates")
	ErrInvalidParentFolder = errors.New("invalid parent folder")
	ErrCircularReference   = errors.New("circular folder reference detected")
)

// Tag errors.
var (
	ErrTagNotFound      = errors.New("tag not found")
	ErrTagAlreadyExists = errors.New("tag with this name already exists")
	ErrTagInUse         = errors.New("tag is in use by templates")
	ErrInvalidTagColor  = errors.New("invalid tag color format")
)

// Injectable Definition errors.
var (
	ErrInjectableNotFound         = errors.New("injectable definition not found")
	ErrInjectableAlreadyExists    = errors.New("injectable with this key already exists")
	ErrInjectableInUse            = errors.New("injectable is in use by templates")
	ErrInvalidInjectableKey       = errors.New("invalid injectable key")
	ErrInvalidDataType            = errors.New("invalid injectable data type")
	ErrTemplateInjectableNotFound = errors.New("template injectable not found")
	ErrOnlyTextTypeAllowed        = errors.New("only TEXT type injectables can be created by workspaces")
	ErrWorkspaceIDRequired        = errors.New("workspace ID is required for this injectable")
	ErrCannotModifyGlobal         = errors.New("cannot modify global injectable definitions")
)

// Template errors.
var (
	ErrTemplateNotFound      = errors.New("template not found")
	ErrTemplateAlreadyExists = errors.New("template with this title already exists")
)

// Template Version errors.
var (
	ErrVersionNotFound                 = errors.New("template version not found")
	ErrVersionAlreadyExists            = errors.New("version number already exists for this template")
	ErrVersionNameExists               = errors.New("version name already exists for this template")
	ErrVersionNotPublished             = errors.New("version must be published to promote")
	ErrVersionAlreadyPublished         = errors.New("version is already published")
	ErrCannotEditPublished             = errors.New("cannot edit published version")
	ErrCannotEditArchived              = errors.New("cannot edit archived version")
	ErrNoPublishedVersion              = errors.New("template has no published version")
	ErrCannotArchiveWithoutReplacement = errors.New("cannot schedule archive without scheduled replacement")
	ErrInvalidVersionStatus            = errors.New("invalid version status")
	ErrInvalidVersionNumber            = errors.New("invalid version number")
	ErrScheduledTimeInPast             = errors.New("scheduled time must be in the future")
	ErrInvalidContentStructure         = errors.New("invalid template content structure")
	ErrMissingRequiredVariable         = errors.New("missing required template variable")
	ErrSignerRoleNotFound              = errors.New("signer role not found")
	ErrInvalidSignerRole               = errors.New("invalid signer role configuration")
	ErrDuplicateSignerAnchor           = errors.New("duplicate signer anchor")
	ErrDuplicateSignerOrder            = errors.New("duplicate signer order")
	ErrVersionInjectableNotFound       = errors.New("version injectable not found")
	ErrContentValidationFailed         = errors.New("content validation failed")
	ErrMissingRequiredContent          = errors.New("content structure is required for publishing")
	ErrVersionDoesNotBelongToTemplate  = errors.New("version does not belong to the specified template")
	ErrTargetTemplateRequired          = errors.New("target template ID is required for NEW_VERSION mode")
	ErrTargetTemplateNotInWorkspace    = errors.New("target template does not belong to the destination workspace")
	ErrScheduledTimeConflict           = errors.New("another version is already scheduled at this time")
)

// Document errors.
var (
	ErrDocumentNotFound                 = errors.New("document not found")
	ErrDocumentAlreadySent              = errors.New("document already sent for signing")
	ErrDocumentCompleted                = errors.New("document signing already completed")
	ErrDocumentVoided                   = errors.New("document has been voided")
	ErrInvalidDocumentState             = errors.New("invalid document state for this operation")
	ErrInvalidDocumentStatus            = errors.New("invalid document status")
	ErrInvalidDocumentStatusTransition  = errors.New("invalid document status transition")
	ErrDocumentRecipientNotFound        = errors.New("document recipient not found")
	ErrInvalidRecipientStatus           = errors.New("invalid recipient status")
	ErrInvalidRecipientStatusTransition = errors.New("invalid recipient status transition")
	ErrDuplicateRecipientRole           = errors.New("duplicate recipient role assignment")
)

// Signing Provider errors.
var (
	ErrSigningProviderNotConfigured = errors.New("signing provider not configured")
	ErrSigningProviderError         = errors.New("signing provider error")
	ErrSigningUploadFailed          = errors.New("failed to upload document to signing provider")
	ErrSigningURLFailed             = errors.New("failed to get signing URL")
	ErrSigningStatusFailed          = errors.New("failed to get document status from provider")
	ErrSigningCancelFailed          = errors.New("failed to cancel document")
	ErrInvalidWebhookSignature      = errors.New("invalid webhook signature")
	ErrWebhookProcessingFailed      = errors.New("webhook processing failed")
)

// Validation errors.
var (
	ErrValidationFailed = errors.New("validation failed")
	ErrInvalidUUID      = errors.New("invalid UUID format")
	ErrRequiredField    = errors.New("required field is missing")
	ErrFieldTooLong     = errors.New("field exceeds maximum length")
	ErrFieldTooShort    = errors.New("field is below minimum length")
)

// Database errors.
var (
	ErrDatabaseConnection = errors.New("database connection error")
	ErrDatabaseQuery      = errors.New("database query error")
	ErrOptimisticLock     = errors.New("optimistic lock conflict - record was modified")
	ErrRecordNotFound     = errors.New("record not found")
)

// Access History errors.
var (
	ErrInvalidAccessEntityType = errors.New("invalid access entity type")
)

// LLM Service errors.
var (
	ErrLLMServiceUnavailable = errors.New("AI generation service is temporarily unavailable")
)

// ContentValidationError wraps multiple validation errors from content validation.
type ContentValidationError struct {
	Errors   []ContentValidationItem
	Warnings []ContentValidationItem
}

// ContentValidationItem represents a single validation error or warning.
type ContentValidationItem struct {
	Code    string
	Path    string
	Message string
}

// Error implements the error interface.
func (e *ContentValidationError) Error() string {
	if len(e.Errors) == 0 {
		return "content validation failed"
	}
	return "content validation failed: " + e.Errors[0].Message
}

// HasErrors returns true if there are validation errors.
func (e *ContentValidationError) HasErrors() bool {
	return len(e.Errors) > 0
}

// HasWarnings returns true if there are validation warnings.
func (e *ContentValidationError) HasWarnings() bool {
	return len(e.Warnings) > 0
}
