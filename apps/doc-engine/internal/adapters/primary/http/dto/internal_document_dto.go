package dto

import "github.com/doc-assembly/doc-engine/internal/core/entity"

// InternalCreateDocumentResponse is the response for document creation via internal API.
type InternalCreateDocumentResponse struct {
	ID                string  `json:"id"`
	WorkspaceID       string  `json:"workspaceId"`
	TemplateID        string  `json:"templateId"`
	TemplateVersionID string  `json:"templateVersionId"`
	ExternalID        string  `json:"externalId"`
	TransactionalID   string  `json:"transactionalId"`
	OperationType     string  `json:"operationType"`
	Status            string  `json:"status"`
	SignerProvider    *string `json:"signerProvider,omitempty"`
	CreatedAt         string  `json:"createdAt"`
}

// InternalDocumentRecipientResponse represents a recipient in the internal API response.
type InternalDocumentRecipientResponse struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
}

// InternalCreateDocumentWithRecipientsResponse includes recipients in the response.
type InternalCreateDocumentWithRecipientsResponse struct {
	InternalCreateDocumentResponse
	Recipients []InternalDocumentRecipientResponse `json:"recipients,omitempty"`
}

// InternalErrorResponse is the error response for internal API.
type InternalErrorResponse struct {
	Error   string   `json:"error"`
	Code    string   `json:"code,omitempty"`
	Details []string `json:"details,omitempty"`
}

// MissingInjectablesErrorResponse is the response for missing injectables error.
type MissingInjectablesErrorResponse struct {
	Error        string   `json:"error"`
	Code         string   `json:"code"`
	MissingCodes []string `json:"missingCodes"`
}

// NewMissingInjectablesErrorResponse creates a response for missing injectables error.
func NewMissingInjectablesErrorResponse(err *entity.MissingInjectablesError) MissingInjectablesErrorResponse {
	return MissingInjectablesErrorResponse{
		Error:        err.Error(),
		Code:         "MISSING_INJECTABLES",
		MissingCodes: err.MissingCodes,
	}
}
