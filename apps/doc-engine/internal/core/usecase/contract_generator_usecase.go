package usecase

import (
	"context"
	"time"

	"github.com/doc-assembly/doc-engine/internal/core/entity/portabledoc"
)

// InjectableInfo contains minimal information about an injectable for LLM context.
type InjectableInfo struct {
	// Key is the technical key of the injectable (e.g., "client_name").
	Key string
	// Label is the human-readable label (e.g., "Client Name").
	Label string
	// DataType is the data type (e.g., "TEXT", "DATE", "CURRENCY").
	DataType string
}

// GenerateContractCommand represents the command to generate a contract from content.
type GenerateContractCommand struct {
	// WorkspaceID is the workspace context for the generation.
	WorkspaceID string
	// ContentType is the type of input content: "image", "pdf", "docx", or "text".
	ContentType string
	// Content is the actual content - base64 encoded for image/pdf/docx, plain text for text.
	Content string
	// MimeType is the MIME type for image/pdf/docx content (e.g., "image/png", "application/pdf").
	// Required for image, pdf, and docx content types.
	MimeType string
	// OutputLang is the desired language for the generated contract content (e.g., "es", "en").
	OutputLang string
	// AvailableInjectables is the list of injectables available in the workspace.
	// The LLM will only use injectables from this list when generating the document.
	AvailableInjectables []InjectableInfo
}

// GenerateContractResult contains the result of contract generation.
type GenerateContractResult struct {
	// Document is the generated portable document.
	Document *portabledoc.Document
	// TokensUsed is the number of tokens consumed by the LLM.
	TokensUsed int
	// Model is the LLM model used for generation.
	Model string
	// GeneratedAt is the timestamp when the document was generated.
	GeneratedAt time.Time
}

// ContractGeneratorUseCase defines the input port for contract generation operations.
type ContractGeneratorUseCase interface {
	// GenerateContract analyzes the provided content and generates a structured contract document.
	// The content can be a scanned image, PDF, or text description of a contract.
	// Returns a PortableDocument JSON that can be used in the contract editor.
	GenerateContract(ctx context.Context, cmd GenerateContractCommand) (*GenerateContractResult, error)
}
