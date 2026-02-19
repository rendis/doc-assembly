package document

import (
	"context"
	"encoding/json"

	"github.com/rendis/doc-assembly/core/internal/core/entity"
	"github.com/rendis/doc-assembly/core/internal/core/entity/portabledoc"
)

// PreSigningUseCase defines the input port for pre-signing operations.
// These operations are used by the public signing form (no auth required, token-validated).
type PreSigningUseCase interface {
	// GetPreSigningForm returns the pre-signing form data for a given access token.
	GetPreSigningForm(ctx context.Context, token string) (*PreSigningFormDTO, error)

	// SubmitPreSigningForm submits field responses and triggers signing flow.
	// Returns the signing URL for the recipient.
	SubmitPreSigningForm(ctx context.Context, token string, responses []FieldResponseInput) (string, error)

	// RegenerateToken invalidates existing tokens for a document and generates a new one.
	// Requires the document to be in AWAITING_INPUT status.
	RegenerateToken(ctx context.Context, documentID string) (*entity.DocumentAccessToken, error)
}

// FieldResponseInput represents a single field response from the signer.
type FieldResponseInput struct {
	FieldID  string          `json:"fieldId"`
	Response json.RawMessage `json:"response"` // {"selectedOptionIds":[...]} or {"text":"..."}
}

// PreSigningFormDTO contains all data needed to render the pre-signing form.
type PreSigningFormDTO struct {
	DocumentTitle  string                `json:"documentTitle"`
	DocumentStatus string                `json:"documentStatus"`
	RecipientName  string                `json:"recipientName"`
	RecipientEmail string                `json:"recipientEmail"`
	RoleID         string                `json:"roleId"`
	Content        json.RawMessage       `json:"content"` // full portabledoc ProseMirror content
	Fields         []InteractiveFieldDTO `json:"fields"`  // fields for this role
}

// InteractiveFieldDTO describes a single interactive field for the pre-signing form.
type InteractiveFieldDTO struct {
	ID          string                          `json:"id"`
	FieldType   string                          `json:"fieldType"`
	Label       string                          `json:"label"`
	Required    bool                            `json:"required"`
	Options     []portabledoc.InteractiveOption `json:"options,omitempty"`
	Placeholder string                          `json:"placeholder,omitempty"`
	MaxLength   int                             `json:"maxLength,omitempty"`
}
