package contentvalidator

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/doc-assembly/doc-engine/internal/core/entity/portabledoc"
	"github.com/doc-assembly/doc-engine/internal/core/port"
)

// validationContext holds shared state during validation.
type validationContext struct {
	ctx         context.Context
	workspaceID string
	versionID   string
	doc         *portabledoc.Document
	result      *port.ContentValidationResult
	service     *Service

	// Computed sets for validation
	roleIDSet   portabledoc.Set[string]
	variableSet portabledoc.Set[string] // includes role variables

	// Accessible injectables cache (loaded from DB)
	accessibleInjectables portabledoc.Set[string]
}

// addError adds a validation error.
func (vc *validationContext) addError(code, path, message string) {
	vc.result.AddError(code, path, message)
}

// addErrorf adds a formatted validation error.
func (vc *validationContext) addErrorf(code, path, format string, args ...any) {
	vc.result.AddError(code, path, fmt.Sprintf(format, args...))
}

// addWarning adds a validation warning.
func (vc *validationContext) addWarning(code, path, message string) {
	vc.result.AddWarning(code, path, message)
}

// addWarningf adds a formatted validation warning.
func (vc *validationContext) addWarningf(code, path, format string, args ...any) {
	vc.result.AddWarning(code, path, fmt.Sprintf(format, args...))
}

// checkCancelled checks if context was cancelled.
func (vc *validationContext) checkCancelled() bool {
	select {
	case <-vc.ctx.Done():
		vc.addError(ErrCodeValidationCancelled, "", "Validation was cancelled")
		return true
	default:
		return false
	}
}

// validatePublish orchestrates all publish-time validations.
func (s *Service) validatePublish(
	ctx context.Context,
	workspaceID, versionID string,
	content []byte,
) *port.ContentValidationResult {
	result := port.NewValidationResult()

	slog.DebugContext(ctx, "starting content validation",
		slog.String("workspace_id", workspaceID),
		slog.String("version_id", versionID),
	)

	// 1. Parse document
	doc, err := portabledoc.Parse(content)
	if err != nil {
		result.AddError(ErrCodeInvalidJSON, "", sanitizeJSONError(err))
		return result
	}

	if doc == nil {
		result.AddError(ErrCodeEmptyContent, "", "Content structure is required for publishing")
		return result
	}

	// 2. Build validation context
	vctx := &validationContext{
		ctx:         ctx,
		workspaceID: workspaceID,
		versionID:   versionID,
		doc:         doc,
		result:      result,
		service:     s,
		roleIDSet:   buildRoleIDSet(doc.SignerRoles),
		variableSet: buildVariableSet(doc.VariableIDs, doc.SignerRoles),
	}

	// 3. Load accessible injectables from database
	if err := s.loadAccessibleInjectables(vctx); err != nil {
		slog.WarnContext(ctx, "failed to load accessible injectables",
			slog.String("error", err.Error()),
		)
		// Continue validation without DB check - will be caught by other validators
	}

	// 4. Run validators in sequence
	validators := []func(*validationContext){
		s.validateStructure,
		s.validatePageConfig,
		s.validateSignerRoles,
		s.validateVariables,
		s.validateSignatures,
		s.validateConditionals,
		s.validateWorkflow,
	}

	for _, validate := range validators {
		if vctx.checkCancelled() {
			break
		}
		validate(vctx)
	}

	// 5. Extract signer roles only if valid
	if result.Valid {
		result.ExtractedSignerRoles = extractSignerRoles(versionID, doc)
		slog.DebugContext(ctx, "content validation successful",
			slog.Int("signer_roles", len(result.ExtractedSignerRoles)),
		)
	} else {
		slog.WarnContext(ctx, "content validation failed",
			slog.Int("error_count", result.ErrorCount()),
			slog.Int("warning_count", result.WarningCount()),
		)
	}

	return result
}

// buildRoleIDSet creates a set of signer role IDs from the document.
func buildRoleIDSet(roles []portabledoc.SignerRole) portabledoc.Set[string] {
	set := make(portabledoc.Set[string], len(roles))
	for _, role := range roles {
		if role.ID != "" {
			set.Add(role.ID)
		}
	}
	return set
}

// buildVariableSet creates a set of valid variable IDs.
// Includes both document variables and role-generated variables.
func buildVariableSet(variableIDs []string, roles []portabledoc.SignerRole) portabledoc.Set[string] {
	set := portabledoc.NewSet(variableIDs)

	// Add role-generated variables (ROLE.{label}.name and ROLE.{label}.email)
	for _, role := range roles {
		if role.Label != "" {
			set.Add(portabledoc.BuildRoleVariableID(role.Label, portabledoc.RolePropertyName))
			set.Add(portabledoc.BuildRoleVariableID(role.Label, portabledoc.RolePropertyEmail))
		}
	}

	return set
}

// loadAccessibleInjectables loads the set of injectable keys accessible to the workspace.
func (s *Service) loadAccessibleInjectables(vctx *validationContext) error {
	if s.injectableRepo == nil {
		vctx.accessibleInjectables = make(portabledoc.Set[string])
		return nil
	}

	injectables, err := s.injectableRepo.FindByWorkspace(vctx.ctx, vctx.workspaceID)
	if err != nil {
		return err
	}

	vctx.accessibleInjectables = make(portabledoc.Set[string], len(injectables))
	for _, inj := range injectables {
		vctx.accessibleInjectables.Add(inj.Key)
	}

	return nil
}
