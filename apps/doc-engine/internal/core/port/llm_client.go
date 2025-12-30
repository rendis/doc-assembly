// Package port defines output port interfaces for the core domain.
package port

import (
	"context"
	"encoding/json"
)

// LLMContentType represents the type of content being sent to the LLM.
type LLMContentType string

const (
	// LLMContentTypeImage represents an image content (base64 encoded).
	LLMContentTypeImage LLMContentType = "image"
	// LLMContentTypePDF represents a PDF document (base64 encoded).
	LLMContentTypePDF LLMContentType = "pdf"
	// LLMContentTypeDocx represents a DOCX document (base64 encoded).
	LLMContentTypeDocx LLMContentType = "docx"
	// LLMContentTypeText represents plain text content.
	LLMContentTypeText LLMContentType = "text"
)

// LLMContentPart represents a piece of content to send to the LLM.
type LLMContentPart struct {
	// Type is the type of content (image, pdf, or text).
	Type LLMContentType
	// Content is the actual content - base64 for image/pdf, plain text for text.
	Content string
	// MimeType is the MIME type for image/pdf content (e.g., "image/png", "application/pdf").
	MimeType string
}

// LLMGenerationRequest contains the data needed to generate structured output from an LLM.
type LLMGenerationRequest struct {
	// SystemPrompt is the system-level instructions for the LLM.
	SystemPrompt string
	// UserContent contains the content parts to process.
	UserContent []LLMContentPart
	// OutputLang is the desired output language (e.g., "es", "en").
	OutputLang string
	// JSONSchema is the JSON schema for structured output validation.
	JSONSchema json.RawMessage
}

// LLMGenerationResponse contains the response from the LLM.
type LLMGenerationResponse struct {
	// Content is the generated JSON content.
	Content json.RawMessage
	// TokensUsed is the total number of tokens used in the request.
	TokensUsed int
	// Model is the model identifier used for generation.
	Model string
	// FinishReason indicates why the generation stopped.
	FinishReason string
}

// LLMClient defines the interface for LLM operations.
// This interface is provider-agnostic and can be implemented by different LLM providers.
type LLMClient interface {
	// GenerateStructured generates structured JSON output from the given request.
	// The response content must conform to the provided JSON schema.
	GenerateStructured(ctx context.Context, req *LLMGenerationRequest) (*LLMGenerationResponse, error)

	// Ping verifies the connection to the LLM provider.
	// Returns nil if connection is healthy, error otherwise.
	Ping(ctx context.Context) error

	// ProviderName returns the name of the LLM provider (e.g., "openai", "anthropic").
	ProviderName() string
}
