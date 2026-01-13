package contentvalidator

import (
	"fmt"
	"regexp"
	"strings"

	"github.com/doc-assembly/doc-engine/internal/core/entity"
	"github.com/doc-assembly/doc-engine/internal/core/entity/portabledoc"
)

// anchorSanitizer removes non-alphanumeric characters for anchor string generation.
var anchorSanitizer = regexp.MustCompile(`[^a-z0-9_]`)

// validateSignerRoles validates all signer roles in the document.
func (s *Service) validateSignerRoles(vctx *validationContext) {
	roles := vctx.doc.SignerRoles

	// Warn if no signer roles defined
	if len(roles) == 0 {
		vctx.addWarning(WarnCodeNoSignerRoles, "signerRoles", "No signer roles defined in document")
		return
	}

	// Track seen IDs and orders for duplicate detection
	seenIDs := make(portabledoc.Set[string])
	seenOrders := make(portabledoc.Set[int])

	for i, role := range roles {
		path := fmt.Sprintf("signerRoles[%d]", i)
		validateSignerRole(vctx, role, path, seenIDs, seenOrders)
	}
}

// validateSignerRole validates a single signer role.
func validateSignerRole(
	vctx *validationContext,
	role portabledoc.SignerRole,
	path string,
	seenIDs portabledoc.Set[string],
	seenOrders portabledoc.Set[int],
) {
	// ID is required and must be unique
	if role.ID == "" {
		vctx.addError(ErrCodeEmptyRoleID, path+".id", "Signer role ID is required")
	} else if seenIDs.Contains(role.ID) {
		vctx.addErrorf(ErrCodeDuplicateRoleID, path+".id",
			"Duplicate signer role ID: %s", role.ID)
	} else {
		seenIDs.Add(role.ID)
	}

	// Label is required
	if role.Label == "" {
		vctx.addError(ErrCodeEmptyRoleLabel, path+".label", "Signer role label is required")
	}

	// Order must be positive and unique
	if role.Order < 1 {
		vctx.addErrorf(ErrCodeInvalidRoleOrder, path+".order",
			"Signer order must be >= 1, got: %d", role.Order)
	} else if seenOrders.Contains(role.Order) {
		vctx.addErrorf(ErrCodeDuplicateRoleOrder, path+".order",
			"Duplicate signer order: %d", role.Order)
	} else {
		seenOrders.Add(role.Order)
	}

	// Validate name field
	validateFieldValue(vctx, role.Name, path+".name", "Name", vctx.doc.VariableIDs, vctx.accessibleInjectables)

	// Validate email field
	validateFieldValue(vctx, role.Email, path+".email", "Email", vctx.doc.VariableIDs, vctx.accessibleInjectables)
}

// validateFieldValue validates a SignerRoleFieldValue.
func validateFieldValue(
	vctx *validationContext,
	field portabledoc.FieldValue,
	path string,
	fieldName string,
	variableIDs []string,
	accessibleInjectables portabledoc.Set[string],
) {
	// Type must be valid
	if !portabledoc.ValidFieldTypes.Contains(field.Type) {
		vctx.addErrorf(ErrCodeInvalidRoleField, path+".type",
			"Invalid %s field type: %s. Must be 'text' or 'injectable'", fieldName, field.Type)
		return
	}

	// Validate based on type
	if field.IsText() {
		// Text value must not be empty
		if field.IsEmpty() {
			vctx.addErrorf(ErrCodeEmptyRoleFieldValue, path+".value",
				"%s text value is required", fieldName)
		}
	} else if field.IsInjectable() {
		// Injectable reference must not be empty
		if field.IsEmpty() {
			vctx.addErrorf(ErrCodeEmptyRoleFieldValue, path+".value",
				"%s injectable reference is required", fieldName)
			return
		}

		// Injectable must exist in variableIds
		variableSet := portabledoc.NewSet(variableIDs)
		if !variableSet.Contains(field.Value) {
			vctx.addErrorf(ErrCodeRoleInjectableNotFound, path+".value",
				"%s references variable '%s' which is not in variableIds", fieldName, field.Value)
			return
		}

		// Injectable must be accessible to workspace
		if accessibleInjectables.Len() > 0 && !accessibleInjectables.Contains(field.Value) {
			vctx.addErrorf(ErrCodeInaccessibleInjectable, path+".value",
				"%s references injectable '%s' which is not accessible to this workspace", fieldName, field.Value)
		}
	}
}

// extractSignerRoles converts document signer roles to database entities.
func extractSignerRoles(versionID string, doc *portabledoc.Document) []*entity.TemplateVersionSignerRole {
	if len(doc.SignerRoles) == 0 {
		return nil
	}

	roles := make([]*entity.TemplateVersionSignerRole, 0, len(doc.SignerRoles))
	for _, sr := range doc.SignerRoles {
		anchorString := generateAnchorString(sr.Label)
		role := entity.NewTemplateVersionSignerRole(
			versionID,
			sr.Label,
			anchorString,
			sr.Order,
		)
		roles = append(roles, role)
	}

	return roles
}

// generateAnchorString creates a valid anchor string from a role label.
// Format: __sig_{sanitized_label}__
func generateAnchorString(label string) string {
	// Convert to lowercase
	sanitized := strings.ToLower(label)
	// Replace spaces with underscores
	sanitized = strings.ReplaceAll(sanitized, " ", "_")
	// Remove invalid characters
	sanitized = anchorSanitizer.ReplaceAllString(sanitized, "")
	// Ensure it starts with a letter
	if len(sanitized) > 0 && (sanitized[0] < 'a' || sanitized[0] > 'z') {
		sanitized = "role_" + sanitized
	}
	// Handle empty result
	if sanitized == "" {
		sanitized = "role"
	}
	return fmt.Sprintf("__sig_%s__", sanitized)
}
