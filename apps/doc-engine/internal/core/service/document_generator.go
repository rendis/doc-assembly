package service

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

	"github.com/google/uuid"

	"github.com/doc-assembly/doc-engine/internal/core/entity"
	"github.com/doc-assembly/doc-engine/internal/core/entity/portabledoc"
	"github.com/doc-assembly/doc-engine/internal/core/port"
	"github.com/doc-assembly/doc-engine/internal/core/usecase"
)

// DocumentGenerationResult contains the result of document generation.
type DocumentGenerationResult struct {
	Document   *entity.Document
	Recipients []*entity.DocumentRecipient
}

// DocumentGenerator is the centralized service for document generation.
// It orchestrates the entire flow: validation, mapping, injection, and creation.
// This service is reusable by CREATE, RENEW, AMEND operations.
type DocumentGenerator struct {
	templateRepo   port.TemplateRepository
	versionRepo    port.TemplateVersionRepository
	documentRepo   port.DocumentRepository
	recipientRepo  port.DocumentRecipientRepository
	injectableUC   usecase.InjectableUseCase
	mapperRegistry port.MapperRegistry
	resolver       *InjectableResolverService
	logger         *slog.Logger
}

// NewDocumentGenerator creates a new DocumentGenerator instance.
func NewDocumentGenerator(
	templateRepo port.TemplateRepository,
	versionRepo port.TemplateVersionRepository,
	documentRepo port.DocumentRepository,
	recipientRepo port.DocumentRecipientRepository,
	injectableUC usecase.InjectableUseCase,
	mapperRegistry port.MapperRegistry,
	resolver *InjectableResolverService,
	logger *slog.Logger,
) *DocumentGenerator {
	if logger == nil {
		logger = slog.Default()
	}
	return &DocumentGenerator{
		templateRepo:   templateRepo,
		versionRepo:    versionRepo,
		documentRepo:   documentRepo,
		recipientRepo:  recipientRepo,
		injectableUC:   injectableUC,
		mapperRegistry: mapperRegistry,
		resolver:       resolver,
		logger:         logger,
	}
}

// GenerateDocument is the centralized method for document generation.
// It handles the complete flow:
// 1. Find template → get workspaceID
// 2. Get available injectables for workspace (reuses InjectableService.ListInjectables)
// 3. Find published version with details
// 4. Parse ContentStructure → get SignerRoles
// 5. Collect referenced codes (version injectables + SignerRoles)
// 6. Validate: required codes must be subset of available → error if missing
// 7. Execute Mapper → get payload
// 8. Execute Init + Injectors → resolved values
// 9. Build recipients from SignerRoles + resolved values
// 10. Create and save Document + Recipients
// 11. Return result
//
// Note: PDF rendering and signing provider upload are NOT handled here.
// The caller (InternalDocumentService) handles those steps after generation.
func (g *DocumentGenerator) GenerateDocument(
	ctx context.Context,
	mapCtx *port.MapperContext,
) (*DocumentGenerationResult, error) {
	g.logger.Debug("starting document generation",
		"templateID", mapCtx.TemplateID,
		"externalID", mapCtx.ExternalID,
		"operation", mapCtx.Operation,
	)

	// 1. Find template and derive workspaceID
	template, err := g.templateRepo.FindByID(ctx, mapCtx.TemplateID)
	if err != nil {
		return nil, fmt.Errorf("finding template: %w", err)
	}
	workspaceID := template.WorkspaceID

	g.logger.Debug("found template", "workspaceID", workspaceID)

	// 2. Get available injectables for the workspace
	// REUSES: InjectableService.ListInjectables() - same flow as api/v1/content/injectables
	// Includes: DB injectables + system injectables active for the workspace
	availableInjectables, err := g.injectableUC.ListInjectables(ctx, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("listing available injectables: %w", err)
	}

	g.logger.Debug("found available injectables", "count", len(availableInjectables))

	// 3. Find published version with details
	version, err := g.versionRepo.FindPublishedByTemplateIDWithDetails(ctx, mapCtx.TemplateID)
	if err != nil {
		return nil, entity.ErrNoPublishedVersion
	}

	g.logger.Debug("found published version",
		"versionID", version.ID,
		"versionNumber", version.VersionNumber,
	)

	// 4. Parse ContentStructure to get SignerRoles
	portableDoc, err := g.parseContentStructure(version.ContentStructure)
	if err != nil {
		return nil, fmt.Errorf("parsing content structure: %w", err)
	}

	// 5. Collect referenced codes (version injectables + SignerRoles)
	referencedCodes := g.collectReferencedCodes(version.Injectables, portableDoc.SignerRoles)

	g.logger.Debug("collected referenced codes", "codes", referencedCodes)

	// 6. Validate: all required codes must be available
	if err := g.validateRequiredInjectables(referencedCodes, availableInjectables); err != nil {
		return nil, err
	}

	// 7. Execute Mapper
	mapper, ok := g.mapperRegistry.Get()
	if !ok {
		return nil, entity.ErrNoMapperRegistered
	}

	payload, err := mapper.Map(ctx, mapCtx)
	if err != nil {
		return nil, fmt.Errorf("mapper failed: %w", err)
	}

	g.logger.Debug("mapper executed successfully")

	// 8. Create InjectorContext and resolve injectors
	injCtx := entity.NewInjectorContext(
		mapCtx.ExternalID,
		mapCtx.TemplateID,
		mapCtx.TransactionalID,
		mapCtx.Operation,
		mapCtx.Headers,
		payload,
	)

	resolveResult, err := g.resolver.Resolve(ctx, injCtx, referencedCodes)
	if err != nil {
		return nil, fmt.Errorf("resolving injectors: %w", err)
	}

	g.logger.Debug("injectors resolved", "resolvedCount", len(resolveResult.Values))

	// 9. Convert resolved values to map[string]any
	resolvedValues := make(map[string]any)
	for code, val := range resolveResult.Values {
		resolvedValues[code] = val.AsAny()
	}

	// 10. Build recipients from SignerRoles + resolved values
	recipients := g.buildRecipientsFromSignerRoles(portableDoc.SignerRoles, version.SignerRoles, resolvedValues)

	g.logger.Debug("built recipients", "count", len(recipients))

	// 11. Create document entity
	doc := entity.NewDocument(workspaceID, version.ID)
	doc.SetOperationType(mapCtx.Operation)
	doc.SetExternalReference(mapCtx.ExternalID)
	doc.SetTransactionalID(mapCtx.TransactionalID)
	if err := doc.SetInjectedValuesSnapshot(resolvedValues); err != nil {
		return nil, fmt.Errorf("setting injected values snapshot: %w", err)
	}

	// 12. Save document
	docID, err := g.documentRepo.Create(ctx, doc)
	if err != nil {
		return nil, fmt.Errorf("saving document: %w", err)
	}
	doc.ID = docID

	g.logger.Debug("document saved", "documentID", docID)

	// 13. Set document ID on recipients and save them
	for _, r := range recipients {
		r.DocumentID = docID
	}

	if len(recipients) > 0 {
		if err := g.recipientRepo.CreateBatch(ctx, recipients); err != nil {
			return nil, fmt.Errorf("saving recipients: %w", err)
		}
		g.logger.Debug("recipients saved", "count", len(recipients))
	}

	return &DocumentGenerationResult{
		Document:   doc,
		Recipients: recipients,
	}, nil
}

// parseContentStructure parses the JSON ContentStructure into portabledoc.Document.
func (g *DocumentGenerator) parseContentStructure(content json.RawMessage) (*portabledoc.Document, error) {
	if content == nil {
		return nil, entity.ErrMissingRequiredContent
	}

	var doc portabledoc.Document
	if err := json.Unmarshal(content, &doc); err != nil {
		return nil, fmt.Errorf("unmarshaling content structure: %w", err)
	}

	return &doc, nil
}

// collectReferencedCodes collects all injectable codes referenced by the version.
// This includes:
// - Codes from version injectables
// - Codes referenced in SignerRoles (Name.Value and Email.Value when type is "injectable")
func (g *DocumentGenerator) collectReferencedCodes(
	versionInjectables []*entity.VersionInjectableWithDefinition,
	signerRoles []portabledoc.SignerRole,
) []string {
	codeSet := make(map[string]bool)

	// Codes from version injectables
	for _, vi := range versionInjectables {
		if vi.Definition != nil {
			codeSet[vi.Definition.Key] = true
		}
	}

	// Codes referenced in SignerRoles
	for _, sr := range signerRoles {
		if sr.Name.IsInjectable() && sr.Name.Value != "" {
			codeSet[sr.Name.Value] = true
		}
		if sr.Email.IsInjectable() && sr.Email.Value != "" {
			codeSet[sr.Email.Value] = true
		}
	}

	codes := make([]string, 0, len(codeSet))
	for code := range codeSet {
		codes = append(codes, code)
	}

	return codes
}

// validateRequiredInjectables validates that all required injectable codes are available.
// If any code is missing, returns MissingInjectablesError with the list of missing codes.
func (g *DocumentGenerator) validateRequiredInjectables(
	requiredCodes []string,
	availableInjectables []*entity.InjectableDefinition,
) error {
	// Build set of available keys
	availableKeys := make(map[string]bool, len(availableInjectables))
	for _, inj := range availableInjectables {
		availableKeys[inj.Key] = true
	}

	// Check each required code
	var missingCodes []string
	for _, code := range requiredCodes {
		if !availableKeys[code] {
			missingCodes = append(missingCodes, code)
		}
	}

	if len(missingCodes) > 0 {
		g.logger.Warn("missing required injectables",
			"missingCodes", missingCodes,
			"requiredCount", len(requiredCodes),
			"availableCount", len(availableInjectables),
		)
		return &entity.MissingInjectablesError{
			MissingCodes: missingCodes,
		}
	}

	return nil
}

// buildRecipientsFromSignerRoles builds DocumentRecipient entities from portabledoc SignerRoles.
// It resolves name and email values from the resolved injectable values.
func (g *DocumentGenerator) buildRecipientsFromSignerRoles(
	portableSignerRoles []portabledoc.SignerRole,
	dbSignerRoles []*entity.TemplateVersionSignerRole,
	resolvedValues map[string]any,
) []*entity.DocumentRecipient {
	// Map DB signer roles by their ID (anchor format: __sig_{id}__)
	roleByAnchor := make(map[string]*entity.TemplateVersionSignerRole)
	for _, r := range dbSignerRoles {
		roleByAnchor[r.AnchorString] = r
	}

	recipients := make([]*entity.DocumentRecipient, 0, len(portableSignerRoles))

	for _, sr := range portableSignerRoles {
		// Resolve name
		name := g.resolveFieldValue(sr.Name, resolvedValues)

		// Resolve email
		email := g.resolveFieldValue(sr.Email, resolvedValues)

		// Find the corresponding DB signer role
		// The anchor format in DB is __sig_{id}__ where id matches sr.ID
		anchor := fmt.Sprintf("__sig_%s__", sr.ID)
		dbRole, found := roleByAnchor[anchor]

		if name != "" && email != "" && found {
			recipients = append(recipients, &entity.DocumentRecipient{
				ID:                    uuid.NewString(),
				TemplateVersionRoleID: dbRole.ID,
				Name:                  name,
				Email:                 email,
				Status:                entity.RecipientStatusPending,
			})
		} else {
			g.logger.Warn("skipping signer role - missing data",
				"signerRoleID", sr.ID,
				"hasName", name != "",
				"hasEmail", email != "",
				"foundInDB", found,
			)
		}
	}

	return recipients
}

// resolveFieldValue resolves a FieldValue to its actual string value.
// For "text" type, returns the literal value.
// For "injectable" type, looks up the value in resolvedValues.
func (g *DocumentGenerator) resolveFieldValue(
	field portabledoc.FieldValue,
	resolvedValues map[string]any,
) string {
	if field.IsText() {
		return field.Value
	}

	if field.IsInjectable() {
		if val, ok := resolvedValues[field.Value]; ok {
			if strVal, ok := val.(string); ok {
				return strVal
			}
			// Try to convert to string
			return fmt.Sprintf("%v", val)
		}
	}

	return ""
}
