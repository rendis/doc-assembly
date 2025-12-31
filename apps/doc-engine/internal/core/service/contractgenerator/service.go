package contractgenerator

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/doc-assembly/doc-engine/internal/core/entity"
	"github.com/doc-assembly/doc-engine/internal/core/entity/portabledoc"
	"github.com/doc-assembly/doc-engine/internal/core/port"
	"github.com/doc-assembly/doc-engine/internal/core/usecase"
)

// Service implements the ContractGeneratorUseCase interface.
type Service struct {
	llmClient        port.LLMClient
	extractorFactory port.ContentExtractorFactory
	promptLoader     *PromptLoader
	schema           json.RawMessage
}

// NewService creates a new contract generator service.
func NewService(
	llmClient port.LLMClient,
	extractorFactory port.ContentExtractorFactory,
	promptLoader *PromptLoader,
) *Service {
	return &Service{
		llmClient:        llmClient,
		extractorFactory: extractorFactory,
		promptLoader:     promptLoader,
		schema:           PortableDocumentSchema(),
	}
}

// GenerateContract analyzes the provided content and generates a structured contract document.
// Uses a 3-stage pipeline: Extraction → LLM (Markdown) → Parser (TipTap).
func (s *Service) GenerateContract(ctx context.Context, cmd usecase.GenerateContractCommand) (*usecase.GenerateContractResult, error) {
	// Check if LLM client is available
	if s.llmClient == nil {
		slog.Error("LLM client not configured",
			slog.String("workspace_id", cmd.WorkspaceID),
		)
		return nil, entity.ErrLLMServiceUnavailable
	}

	slog.Info("generating contract - pipeline start",
		slog.String("workspace_id", cmd.WorkspaceID),
		slog.String("content_type", cmd.ContentType),
		slog.String("output_lang", cmd.OutputLang),
	)

	// ═══════════════════════════════════════════════════════════════
	// STAGE 1: TEXT EXTRACTION
	// ═══════════════════════════════════════════════════════════════
	var extractedText string
	var err error

	if cmd.ContentType == "text" {
		// Plain text - use directly
		extractedText = cmd.Content
		slog.Info("stage 1: using plain text input",
			slog.Int("text_length", len(extractedText)),
		)
	} else {
		// Binary content - extract text using appropriate extractor
		extractedText, err = s.extractTextFromContent(ctx, cmd)
		if err != nil {
			return nil, fmt.Errorf("extracting text: %w", err)
		}
		slog.Info("stage 1: text extracted",
			slog.String("content_type", cmd.ContentType),
			slog.Int("text_length", len(extractedText)),
		)
	}

	// ═══════════════════════════════════════════════════════════════
	// STAGE 2: LLM → MARKDOWN WITH MARKERS
	// ═══════════════════════════════════════════════════════════════
	markdown, tokensUsed, model, err := s.generateMarkdownWithLLM(ctx, cmd, extractedText)
	if err != nil {
		return nil, err
	}

	slog.Info("stage 2: markdown generated",
		slog.Int("markdown_length", len(markdown)),
		slog.Int("tokens_used", tokensUsed),
		slog.String("model", model),
	)

	// ═══════════════════════════════════════════════════════════════
	// STAGE 3: PARSE MARKDOWN → TIPTAP
	// ═══════════════════════════════════════════════════════════════
	parsed, err := ParseMarkdownToTipTap(markdown, cmd.AvailableInjectables)
	if err != nil {
		return nil, fmt.Errorf("parsing markdown to tiptap: %w", err)
	}

	slog.Info("stage 3: markdown parsed to tiptap",
		slog.Int("roles_detected", len(parsed.Roles)),
		slog.Int("injectables_detected", len(parsed.Injectables)),
	)

	// ═══════════════════════════════════════════════════════════════
	// BUILD FINAL DOCUMENT
	// ═══════════════════════════════════════════════════════════════
	now := time.Now().UTC()

	// Build signer roles from detected roles
	signerRoles := BuildSignerRoles(parsed.Roles)

	// Build variable IDs from mapped injectables
	variableIDs := BuildVariableIDs(parsed.Injectables)

	doc := &portabledoc.Document{
		Version:         portabledoc.CurrentVersion,
		Meta:            buildMeta(cmd.OutputLang),
		PageConfig:      defaultA4Config(),
		VariableIDs:     variableIDs,
		SignerRoles:     signerRoles,
		SigningWorkflow: defaultWorkflow(),
		Content:         parsed.Content,
		ExportInfo: portabledoc.ExportInfo{
			ExportedAt: now.Format(time.RFC3339),
			SourceApp:  "doc-engine-ai-generator/2.0.0",
		},
	}

	slog.Info("contract generated successfully",
		slog.String("title", doc.Meta.Title),
		slog.Int("variable_count", len(doc.VariableIDs)),
		slog.Int("signer_role_count", len(doc.SignerRoles)),
	)

	return &usecase.GenerateContractResult{
		Document:    doc,
		TokensUsed:  tokensUsed,
		Model:       model,
		GeneratedAt: now,
	}, nil
}

// extractTextFromContent extracts text from binary content using the appropriate extractor.
func (s *Service) extractTextFromContent(ctx context.Context, cmd usecase.GenerateContractCommand) (string, error) {
	// Get the appropriate extractor
	extractor, err := s.extractorFactory.GetExtractor(cmd.ContentType)
	if err != nil {
		return "", fmt.Errorf("no extractor for type %s: %w", cmd.ContentType, err)
	}

	// Decode base64 content
	contentBytes, err := base64.StdEncoding.DecodeString(cmd.Content)
	if err != nil {
		return "", fmt.Errorf("decoding base64 content: %w", err)
	}

	// Extract text
	text, err := extractor.ExtractText(ctx, contentBytes, cmd.MimeType)
	if err != nil {
		return "", fmt.Errorf("extracting text from %s: %w", cmd.ContentType, err)
	}

	return text, nil
}

// generateMarkdownWithLLM sends extracted text to LLM to format as markdown with markers.
func (s *Service) generateMarkdownWithLLM(ctx context.Context, cmd usecase.GenerateContractCommand, extractedText string) (string, int, string, error) {
	// Load the markdown prompt
	systemPrompt, err := s.promptLoader.LoadMarkdownPrompt(cmd.OutputLang, extractedText, cmd.AvailableInjectables)
	if err != nil {
		return "", 0, "", fmt.Errorf("loading markdown prompt: %w", err)
	}

	// Prepare LLM request (text only, since we already extracted the content)
	req := &port.LLMGenerationRequest{
		SystemPrompt: systemPrompt,
		UserContent: []port.LLMContentPart{{
			Type:    port.LLMContentTypeText,
			Content: "Please format the document as instructed.",
		}},
		OutputLang: cmd.OutputLang,
		// No JSON schema - we want plain markdown output
	}

	// Call LLM
	resp, err := s.llmClient.GenerateStructured(ctx, req)
	if err != nil {
		slog.Error("LLM generation failed",
			slog.String("workspace_id", cmd.WorkspaceID),
			slog.String("provider", s.llmClient.ProviderName()),
			slog.Any("error", err),
		)
		return "", 0, "", entity.ErrLLMServiceUnavailable
	}

	markdown := string(resp.Content)
	return markdown, resp.TokensUsed, resp.Model, nil
}

// buildMeta creates document metadata with default values.
func buildMeta(lang string) portabledoc.Meta {
	return portabledoc.Meta{
		Title:    "Generated Contract",
		Language: lang,
	}
}

// defaultA4Config returns the default A4 page configuration.
func defaultA4Config() portabledoc.PageConfig {
	return portabledoc.PageConfig{
		FormatID: portabledoc.PageFormatA4,
		Width:    794,
		Height:   1123,
		Margins: portabledoc.Margins{
			Top:    96,
			Bottom: 96,
			Left:   72,
			Right:  72,
		},
		ShowPageNumbers: true,
		PageGap:         40,
	}
}

// defaultWorkflow returns the default signing workflow configuration.
func defaultWorkflow() *portabledoc.WorkflowConfig {
	return &portabledoc.WorkflowConfig{
		OrderMode: portabledoc.OrderModeSequential,
		Notifications: portabledoc.NotificationConfig{
			Scope: portabledoc.NotifyScopeGlobal,
			GlobalTriggers: portabledoc.TriggerMap{
				portabledoc.TriggerOnDocumentCreated:       {Enabled: false},
				portabledoc.TriggerOnTurnToSign:            {Enabled: true},
				portabledoc.TriggerOnAllSignaturesComplete: {Enabled: false},
			},
			RoleConfigs: []portabledoc.RoleNotifyConfig{},
		},
	}
}

// mapContentType converts a string content type to the port.LLMContentType.
// Kept for backward compatibility.
func mapContentType(contentType string) (port.LLMContentType, error) {
	switch contentType {
	case "image":
		return port.LLMContentTypeImage, nil
	case "pdf":
		return port.LLMContentTypePDF, nil
	case "docx":
		return port.LLMContentTypeDocx, nil
	case "text":
		return port.LLMContentTypeText, nil
	default:
		return "", fmt.Errorf("invalid content type: %s (must be 'image', 'pdf', 'docx', or 'text')", contentType)
	}
}
