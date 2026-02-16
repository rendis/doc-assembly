package contentvalidator

import (
	"fmt"
	"strings"

	"github.com/rendis/doc-assembly/core/internal/core/entity"
	"github.com/rendis/doc-assembly/core/internal/core/entity/portabledoc"
	"github.com/rendis/doc-assembly/core/internal/core/validation"
)

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
	validateFieldValue(vctx, role.Name, path+".name", "name", role.Label, vctx.doc.VariableIDs, vctx.accessibleInjectables)

	// Validate email field
	validateFieldValue(vctx, role.Email, path+".email", "email", role.Label, vctx.doc.VariableIDs, vctx.accessibleInjectables)
}

// validateFieldValue validates a SignerRoleFieldValue.
func validateFieldValue(
	vctx *validationContext,
	field portabledoc.FieldValue,
	path string,
	fieldName string,
	roleLabel string,
	variableIDs []string,
	accessibleInjectables portabledoc.Set[string],
) {
	// Type must be valid
	if !portabledoc.ValidFieldTypes.Contains(field.Type) {
		vctx.addErrorf(ErrCodeInvalidRoleField, path+".type",
			"Role '%s': invalid %s field type '%s' (must be 'text' or 'injectable')", roleLabel, fieldName, field.Type)
		return
	}

	// Validate based on type
	if field.IsText() {
		validateTextField(vctx, field, path, fieldName, roleLabel)
	} else if field.IsInjectable() {
		validateInjectableField(vctx, field, path, fieldName, roleLabel, variableIDs, accessibleInjectables)
	}
}

// validateTextField validates a text-type field value.
func validateTextField(vctx *validationContext, field portabledoc.FieldValue, path, fieldName, roleLabel string) {
	if field.IsEmpty() {
		vctx.addErrorf(ErrCodeEmptyRoleFieldValue, path+".value",
			"Role '%s': %s is required", roleLabel, fieldName)
		return
	}

	// Validate email format for hardcoded email values
	if fieldName == "email" && !validation.IsValidEmail(field.Value) {
		vctx.addErrorf(ErrCodeInvalidEmailFormat, path+".value",
			"Role '%s': invalid email format '%s'", roleLabel, field.Value)
	}
}

// validateInjectableField validates an injectable-type field value.
func validateInjectableField(
	vctx *validationContext,
	field portabledoc.FieldValue,
	path, fieldName, roleLabel string,
	variableIDs []string,
	accessibleInjectables portabledoc.Set[string],
) {
	// Injectable reference must not be empty
	if field.IsEmpty() {
		vctx.addErrorf(ErrCodeEmptyRoleFieldValue, path+".value",
			"Role '%s': %s variable reference is required", roleLabel, fieldName)
		return
	}

	// Injectable must exist in variableIds
	variableSet := portabledoc.NewSet(variableIDs)
	if !variableSet.Contains(field.Value) {
		vctx.addErrorf(ErrCodeRoleInjectableNotFound, path+".value",
			"Role '%s': %s references unknown variable '%s'", roleLabel, fieldName, field.Value)
		return
	}

	// Injectable must be accessible to workspace
	if accessibleInjectables.Len() > 0 && !accessibleInjectables.Contains(field.Value) {
		vctx.addErrorf(ErrCodeInaccessibleInjectable, path+".value",
			"Role '%s': %s references inaccessible variable '%s'", roleLabel, fieldName, field.Value)
	}
}

// extractSignerRoles converts document signer roles to database entities.
func extractSignerRoles(versionID string, doc *portabledoc.Document) []*entity.TemplateVersionSignerRole {
	if len(doc.SignerRoles) == 0 {
		return nil
	}

	roles := make([]*entity.TemplateVersionSignerRole, 0, len(doc.SignerRoles))
	for _, sr := range doc.SignerRoles {
		anchorString := portabledoc.GenerateAnchorString(sr.Label)
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

// extractInjectables converts document variable IDs to template version injectables.
// It filters out role variables (ROLE.*) and creates the appropriate injectable
// based on whether it's a system injectable or workspace injectable.
func extractInjectables(vctx *validationContext) []*entity.TemplateVersionInjectable {
	if len(vctx.doc.VariableIDs) == 0 {
		return nil
	}

	injectableMap := buildInjectableMap(vctx.accessibleInjectableList)
	injectables := make([]*entity.TemplateVersionInjectable, 0, len(vctx.doc.VariableIDs))

	for _, varID := range vctx.doc.VariableIDs {
		if strings.HasPrefix(varID, portabledoc.RoleVariablePrefix) {
			continue
		}

		inj, exists := injectableMap[varID]
		if !exists {
			continue
		}

		injectables = append(injectables, buildInjectable(vctx.versionID, varID, inj))
	}
	return injectables
}

// buildInjectableMap creates a key -> definition lookup map.
func buildInjectableMap(list []*entity.InjectableDefinition) map[string]*entity.InjectableDefinition {
	m := make(map[string]*entity.InjectableDefinition, len(list))
	for _, inj := range list {
		m[inj.Key] = inj
	}
	return m
}

// buildInjectable creates the appropriate injectable entity based on source type.
func buildInjectable(versionID, varID string, def *entity.InjectableDefinition) *entity.TemplateVersionInjectable {
	if def.SourceType == entity.InjectableSourceTypeExternal {
		return entity.NewTemplateVersionInjectableFromSystemKey(versionID, varID)
	}
	return entity.NewTemplateVersionInjectable(versionID, def.ID, false, nil)
}
