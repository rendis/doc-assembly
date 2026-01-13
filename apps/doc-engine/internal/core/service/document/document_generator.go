package document

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

	"github.com/google/uuid"

	"github.com/doc-assembly/doc-engine/internal/core/entity"
	"github.com/doc-assembly/doc-engine/internal/core/entity/portabledoc"
	"github.com/doc-assembly/doc-engine/internal/core/port"
	injectablesvc "github.com/doc-assembly/doc-engine/internal/core/service/injectable"
	injectableuc "github.com/doc-assembly/doc-engine/internal/core/usecase/injectable"
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
	injectableUC   injectableuc.InjectableUseCase
	mapperRegistry port.MapperRegistry
	resolver       *injectablesvc.InjectableResolverService
}

// NewDocumentGenerator creates a new DocumentGenerator instance.
func NewDocumentGenerator(
	templateRepo port.TemplateRepository,
	versionRepo port.TemplateVersionRepository,
	documentRepo port.DocumentRepository,
	recipientRepo port.DocumentRecipientRepository,
	injectableUC injectableuc.InjectableUseCase,
	mapperRegistry port.MapperRegistry,
	resolver *injectablesvc.InjectableResolverService,
) *DocumentGenerator {
	return &DocumentGenerator{
		templateRepo:   templateRepo,
		versionRepo:    versionRepo,
		documentRepo:   documentRepo,
		recipientRepo:  recipientRepo,
		injectableUC:   injectableUC,
		mapperRegistry: mapperRegistry,
		resolver:       resolver,
	}
}

// GenerateDocument is the centralized method for document generation.
// It handles the complete flow from template lookup through document creation.
// Note: PDF rendering and signing provider upload are NOT handled here.
// The caller (InternalDocumentService) handles those steps after generation.
func (g *DocumentGenerator) GenerateDocument(
	ctx context.Context,
	mapCtx *port.MapperContext,
) (*DocumentGenerationResult, error) {
	workspaceID, err := g.findWorkspaceID(ctx, mapCtx.TemplateID)
	if err != nil {
		return nil, err
	}

	availableInjectables, err := g.fetchAvailableInjectables(ctx, workspaceID)
	if err != nil {
		return nil, err
	}

	version, err := g.findPublishedVersion(ctx, mapCtx.TemplateID)
	if err != nil {
		return nil, err
	}

	portableDoc, err := g.parseContentStructure(version.ContentStructure)
	if err != nil {
		return nil, fmt.Errorf("parsing content structure: %w", err)
	}

	referencedCodes := g.collectReferencedCodes(version.Injectables, portableDoc.SignerRoles)
	slog.DebugContext(ctx, "collected referenced codes", "codes", referencedCodes)

	if err := g.validateRequiredInjectables(ctx, referencedCodes, availableInjectables); err != nil {
		return nil, err
	}

	payload, err := g.executeMapper(ctx, mapCtx)
	if err != nil {
		return nil, err
	}

	resolvedValues, err := g.resolveInjectables(ctx, mapCtx, payload, referencedCodes)
	if err != nil {
		return nil, err
	}

	recipients := g.buildRecipientsFromSignerRoles(ctx, portableDoc.SignerRoles, version.SignerRoles, resolvedValues)
	slog.DebugContext(ctx, "built recipients", "count", len(recipients))

	doc, err := g.createDocument(ctx, workspaceID, version.ID, mapCtx, resolvedValues)
	if err != nil {
		return nil, err
	}

	if err := g.saveRecipients(ctx, doc.ID, recipients); err != nil {
		return nil, err
	}

	return &DocumentGenerationResult{
		Document:   doc,
		Recipients: recipients,
	}, nil
}

// findWorkspaceID retrieves the workspace ID from the template.
func (g *DocumentGenerator) findWorkspaceID(ctx context.Context, templateID string) (string, error) {
	template, err := g.templateRepo.FindByID(ctx, templateID)
	if err != nil {
		return "", fmt.Errorf("finding template: %w", err)
	}

	slog.DebugContext(ctx, "found template", "workspaceID", template.WorkspaceID)
	return template.WorkspaceID, nil
}

// fetchAvailableInjectables retrieves all injectables available for the workspace.
func (g *DocumentGenerator) fetchAvailableInjectables(
	ctx context.Context,
	workspaceID string,
) ([]*entity.InjectableDefinition, error) {
	injectables, err := g.injectableUC.ListInjectables(ctx, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("listing available injectables: %w", err)
	}

	slog.DebugContext(ctx, "found available injectables", "count", len(injectables))
	return injectables, nil
}

// findPublishedVersion retrieves the published version for the template.
func (g *DocumentGenerator) findPublishedVersion(
	ctx context.Context,
	templateID string,
) (*entity.TemplateVersionWithDetails, error) {
	version, err := g.versionRepo.FindPublishedByTemplateIDWithDetails(ctx, templateID)
	if err != nil {
		return nil, entity.ErrNoPublishedVersion
	}

	slog.DebugContext(ctx, "found published version",
		"versionID", version.ID,
		"versionNumber", version.VersionNumber,
	)
	return version, nil
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
// This includes codes from version injectables and codes referenced in SignerRoles.
func (g *DocumentGenerator) collectReferencedCodes(
	versionInjectables []*entity.VersionInjectableWithDefinition,
	signerRoles []portabledoc.SignerRole,
) []string {
	codeSet := make(map[string]bool)

	for _, vi := range versionInjectables {
		if vi.Definition != nil {
			codeSet[vi.Definition.Key] = true
		}
	}

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
func (g *DocumentGenerator) validateRequiredInjectables(
	ctx context.Context,
	requiredCodes []string,
	availableInjectables []*entity.InjectableDefinition,
) error {
	availableKeys := make(map[string]bool, len(availableInjectables))
	for _, inj := range availableInjectables {
		availableKeys[inj.Key] = true
	}

	var missingCodes []string
	for _, code := range requiredCodes {
		if !availableKeys[code] {
			missingCodes = append(missingCodes, code)
		}
	}

	if len(missingCodes) == 0 {
		return nil
	}

	slog.WarnContext(ctx, "missing required injectables",
		"missingCodes", missingCodes,
		"requiredCount", len(requiredCodes),
		"availableCount", len(availableInjectables),
	)
	return &entity.MissingInjectablesError{MissingCodes: missingCodes}
}

// executeMapper runs the registered mapper to transform the request.
func (g *DocumentGenerator) executeMapper(
	ctx context.Context,
	mapCtx *port.MapperContext,
) (any, error) {
	mapper, ok := g.mapperRegistry.Get()
	if !ok {
		return nil, entity.ErrNoMapperRegistered
	}

	payload, err := mapper.Map(ctx, mapCtx)
	if err != nil {
		return nil, fmt.Errorf("mapper failed: %w", err)
	}

	slog.DebugContext(ctx, "mapper executed successfully")
	return payload, nil
}

// resolveInjectables executes injectors and returns resolved values.
func (g *DocumentGenerator) resolveInjectables(
	ctx context.Context,
	mapCtx *port.MapperContext,
	payload any,
	referencedCodes []string,
) (map[string]any, error) {
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

	slog.DebugContext(ctx, "injectors resolved", "resolvedCount", len(resolveResult.Values))

	resolvedValues := make(map[string]any, len(resolveResult.Values))
	for code, val := range resolveResult.Values {
		resolvedValues[code] = val.AsAny()
	}

	return resolvedValues, nil
}

// buildRecipientsFromSignerRoles builds DocumentRecipient entities from portabledoc SignerRoles.
func (g *DocumentGenerator) buildRecipientsFromSignerRoles(
	ctx context.Context,
	portableSignerRoles []portabledoc.SignerRole,
	dbSignerRoles []*entity.TemplateVersionSignerRole,
	resolvedValues map[string]any,
) []*entity.DocumentRecipient {
	roleByAnchor := make(map[string]*entity.TemplateVersionSignerRole, len(dbSignerRoles))
	for _, r := range dbSignerRoles {
		roleByAnchor[r.AnchorString] = r
	}

	recipients := make([]*entity.DocumentRecipient, 0, len(portableSignerRoles))

	for _, sr := range portableSignerRoles {
		recipient := g.buildRecipient(ctx, sr, roleByAnchor, resolvedValues)
		if recipient != nil {
			recipients = append(recipients, recipient)
		}
	}

	return recipients
}

// buildRecipient creates a single DocumentRecipient from a SignerRole.
func (g *DocumentGenerator) buildRecipient(
	ctx context.Context,
	sr portabledoc.SignerRole,
	roleByAnchor map[string]*entity.TemplateVersionSignerRole,
	resolvedValues map[string]any,
) *entity.DocumentRecipient {
	name := g.resolveFieldValue(sr.Name, resolvedValues)
	email := g.resolveFieldValue(sr.Email, resolvedValues)
	anchor := fmt.Sprintf("__sig_%s__", sr.ID)
	dbRole, found := roleByAnchor[anchor]

	if name == "" || email == "" || !found {
		slog.WarnContext(ctx, "skipping signer role - missing data",
			"signerRoleID", sr.ID,
			"hasName", name != "",
			"hasEmail", email != "",
			"foundInDB", found,
		)
		return nil
	}

	return &entity.DocumentRecipient{
		ID:                    uuid.NewString(),
		TemplateVersionRoleID: dbRole.ID,
		Name:                  name,
		Email:                 email,
		Status:                entity.RecipientStatusPending,
	}
}

// resolveFieldValue resolves a FieldValue to its actual string value.
func (g *DocumentGenerator) resolveFieldValue(
	field portabledoc.FieldValue,
	resolvedValues map[string]any,
) string {
	if field.IsText() {
		return field.Value
	}

	if !field.IsInjectable() {
		return ""
	}

	val, ok := resolvedValues[field.Value]
	if !ok {
		return ""
	}

	if strVal, ok := val.(string); ok {
		return strVal
	}

	return fmt.Sprintf("%v", val)
}

// createDocument creates and persists the document entity.
func (g *DocumentGenerator) createDocument(
	ctx context.Context,
	workspaceID string,
	versionID string,
	mapCtx *port.MapperContext,
	resolvedValues map[string]any,
) (*entity.Document, error) {
	doc := entity.NewDocument(workspaceID, versionID)
	doc.SetOperationType(mapCtx.Operation)
	doc.SetExternalReference(mapCtx.ExternalID)
	doc.SetTransactionalID(mapCtx.TransactionalID)

	if err := doc.SetInjectedValuesSnapshot(resolvedValues); err != nil {
		return nil, fmt.Errorf("setting injected values snapshot: %w", err)
	}

	docID, err := g.documentRepo.Create(ctx, doc)
	if err != nil {
		return nil, fmt.Errorf("saving document: %w", err)
	}

	doc.ID = docID
	slog.DebugContext(ctx, "document saved", "documentID", docID)

	return doc, nil
}

// saveRecipients persists the document recipients.
func (g *DocumentGenerator) saveRecipients(
	ctx context.Context,
	documentID string,
	recipients []*entity.DocumentRecipient,
) error {
	if len(recipients) == 0 {
		return nil
	}

	for _, r := range recipients {
		r.DocumentID = documentID
	}

	if err := g.recipientRepo.CreateBatch(ctx, recipients); err != nil {
		return fmt.Errorf("saving recipients: %w", err)
	}

	slog.DebugContext(ctx, "recipients saved", "count", len(recipients))
	return nil
}
