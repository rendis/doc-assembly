package dto

import (
	"time"

	"github.com/doc-assembly/doc-engine/internal/core/entity/portabledoc"
)

// GenerateContractRequest represents the request to generate a contract from content.
type GenerateContractRequest struct {
	// ContentType is the type of input content: "image", "pdf", "docx", or "text".
	// Required.
	ContentType string `json:"contentType" binding:"required,oneof=image pdf docx text"`

	// Content is the actual content - base64 encoded for image/pdf/docx, plain text for text.
	// Required.
	Content string `json:"content" binding:"required"`

	// MimeType is the MIME type for image/pdf/docx content.
	// Required for image, pdf, and docx content types.
	// Example values: "image/png", "image/jpeg", "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	MimeType string `json:"mimeType"`

	// OutputLang is the desired language for the generated contract content.
	// Defaults to "es" if not provided.
	// Supported values: "es", "en"
	OutputLang string `json:"outputLang" binding:"omitempty,oneof=es en"`
}

// GenerateContractResponse represents the response from contract generation.
type GenerateContractResponse struct {
	// Document is the generated portable document.
	Document *portabledoc.Document `json:"document"`

	// TokensUsed is the number of tokens consumed by the LLM.
	TokensUsed int `json:"tokensUsed"`

	// Model is the LLM model used for generation.
	Model string `json:"model"`

	// GeneratedAt is the timestamp when the document was generated.
	GeneratedAt time.Time `json:"generatedAt"`
}
