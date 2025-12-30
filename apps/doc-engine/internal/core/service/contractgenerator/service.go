package contractgenerator

import (
	"context"
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
	llmClient    port.LLMClient
	promptLoader *PromptLoader
	schema       json.RawMessage
}

// NewService creates a new contract generator service.
func NewService(llmClient port.LLMClient, promptLoader *PromptLoader) *Service {
	return &Service{
		llmClient:    llmClient,
		promptLoader: promptLoader,
		schema:       PortableDocumentSchema(),
	}
}

// GenerateContract analyzes the provided content and generates a structured contract document.
func (s *Service) GenerateContract(ctx context.Context, cmd usecase.GenerateContractCommand) (*usecase.GenerateContractResult, error) {
	// Check if LLM client is available
	if s.llmClient == nil {
		slog.Error("LLM client not configured",
			slog.String("workspace_id", cmd.WorkspaceID),
		)
		return nil, entity.ErrLLMServiceUnavailable
	}

	slog.Info("generating contract",
		slog.String("workspace_id", cmd.WorkspaceID),
		slog.String("content_type", cmd.ContentType),
		slog.String("output_lang", cmd.OutputLang),
	)

	// 1. Load and prepare the prompt with the output language and available injectables
	systemPrompt, err := s.promptLoader.LoadWithLangAndInjectables(cmd.OutputLang, cmd.AvailableInjectables)
	if err != nil {
		return nil, fmt.Errorf("loading prompt template: %w", err)
	}

	// 2. Map content type to port type
	contentType, err := mapContentType(cmd.ContentType)
	if err != nil {
		return nil, err
	}

	// 3. Prepare the LLM request
	req := &port.LLMGenerationRequest{
		SystemPrompt: systemPrompt,
		UserContent: []port.LLMContentPart{{
			Type:     contentType,
			Content:  cmd.Content,
			MimeType: cmd.MimeType,
		}},
		OutputLang: cmd.OutputLang,
		JSONSchema: s.schema,
	}

	// 4. Call the LLM with graceful error handling
	resp, err := s.llmClient.GenerateStructured(ctx, req)
	if err != nil {
		// Log detailed error for debugging
		slog.Error("LLM generation failed",
			slog.String("workspace_id", cmd.WorkspaceID),
			slog.String("provider", s.llmClient.ProviderName()),
			slog.Any("error", err),
		)
		// Return generic error to user
		return nil, entity.ErrLLMServiceUnavailable
	}

	slog.Info("llm response received",
		slog.Int("tokens_used", resp.TokensUsed),
		slog.String("model", resp.Model),
		slog.String("finish_reason", resp.FinishReason),
	)

	// 5. Parse and validate the response
	var doc portabledoc.Document
	if err := json.Unmarshal(resp.Content, &doc); err != nil {
		return nil, fmt.Errorf("parsing LLM response: %w", err)
	}

	// 6. Fill in automatic fields
	now := time.Now().UTC()
	doc.Version = portabledoc.CurrentVersion
	doc.ExportInfo = portabledoc.ExportInfo{
		ExportedAt: now.Format(time.RFC3339),
		SourceApp:  "doc-engine-ai-generator/1.0.0",
	}

	slog.Info("contract generated successfully",
		slog.String("title", doc.Meta.Title),
		slog.Int("variable_count", len(doc.VariableIDs)),
		slog.Int("signer_role_count", len(doc.SignerRoles)),
	)

	return &usecase.GenerateContractResult{
		Document:    &doc,
		TokensUsed:  resp.TokensUsed,
		Model:       resp.Model,
		GeneratedAt: now,
	}, nil
}

// mapContentType converts a string content type to the port.LLMContentType.
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
