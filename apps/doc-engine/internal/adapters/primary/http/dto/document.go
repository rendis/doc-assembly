package dto

// CreateDocumentRequest is the request body for creating a document.
type CreateDocumentRequest struct {
	TemplateVersionID         string                   `json:"templateVersionId" binding:"required"`
	Title                     string                   `json:"title" binding:"required"`
	ClientExternalReferenceID *string                  `json:"clientExternalReferenceId,omitempty"`
	InjectedValues            map[string]any           `json:"injectedValues,omitempty"`
	Recipients                []CreateRecipientRequest `json:"recipients" binding:"required,min=1,dive"`
}

// CreateRecipientRequest represents a recipient in the create document request.
type CreateRecipientRequest struct {
	RoleID string `json:"roleId" binding:"required"`
	Name   string `json:"name" binding:"required"`
	Email  string `json:"email" binding:"required,email"`
}

// DocumentResponse represents a document in API responses.
type DocumentResponse struct {
	ID                        string              `json:"id"`
	WorkspaceID               string              `json:"workspaceId"`
	TemplateVersionID         string              `json:"templateVersionId"`
	Title                     *string             `json:"title,omitempty"`
	ClientExternalReferenceID *string             `json:"clientExternalReferenceId,omitempty"`
	SignerProvider            *string             `json:"signerProvider,omitempty"`
	Status                    string              `json:"status"`
	CompletedPDFURL           *string             `json:"completedPdfUrl,omitempty"`
	CreatedAt                 string              `json:"createdAt"`
	UpdatedAt                 *string             `json:"updatedAt,omitempty"`
	Recipients                []RecipientResponse `json:"recipients,omitempty"`
}

// DocumentListResponse represents a document in list responses.
type DocumentListResponse struct {
	ID                        string  `json:"id"`
	WorkspaceID               string  `json:"workspaceId"`
	TemplateVersionID         string  `json:"templateVersionId"`
	Title                     *string `json:"title,omitempty"`
	ClientExternalReferenceID *string `json:"clientExternalReferenceId,omitempty"`
	SignerProvider            *string `json:"signerProvider,omitempty"`
	Status                    string  `json:"status"`
	CreatedAt                 string  `json:"createdAt"`
	UpdatedAt                 *string `json:"updatedAt,omitempty"`
}

// RecipientResponse represents a document recipient in API responses.
type RecipientResponse struct {
	ID          string  `json:"id"`
	RoleID      string  `json:"roleId"`
	RoleName    string  `json:"roleName,omitempty"`
	Name        string  `json:"name"`
	Email       string  `json:"email"`
	Status      string  `json:"status"`
	SignerOrder int     `json:"signerOrder,omitempty"`
	SignedAt    *string `json:"signedAt,omitempty"`
	CreatedAt   string  `json:"createdAt"`
	UpdatedAt   *string `json:"updatedAt,omitempty"`
}

// SigningURLResponse represents the response for a signing URL request.
type SigningURLResponse struct {
	SigningURL string  `json:"signingUrl"`
	ExpiresAt  *string `json:"expiresAt,omitempty"`
}

// DocumentStatisticsResponse represents document statistics.
type DocumentStatisticsResponse struct {
	Total      int            `json:"total"`
	ByStatus   map[string]int `json:"byStatus"`
	Pending    int            `json:"pending"`
	InProgress int            `json:"inProgress"`
	Completed  int            `json:"completed"`
	Declined   int            `json:"declined"`
}
