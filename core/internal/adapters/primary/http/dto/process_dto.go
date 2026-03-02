package dto

import (
	"strings"
	"time"
)

// ProcessResponse represents a process in API responses.
type ProcessResponse struct {
	ID          string            `json:"id"`
	TenantID    string            `json:"tenantId"`
	Code        string            `json:"code"`
	ProcessType string            `json:"processType"`
	Name        map[string]string `json:"name"`
	Description map[string]string `json:"description,omitempty"`
	IsGlobal    bool              `json:"isGlobal"` // True if from SYS tenant (read-only for other tenants)
	CreatedAt   time.Time         `json:"createdAt"`
	UpdatedAt   *time.Time        `json:"updatedAt,omitempty"`
}

// ProcessListItemResponse includes the template count.
type ProcessListItemResponse struct {
	ProcessResponse
	TemplatesCount int `json:"templatesCount"`
}

// ProcessTemplateInfoResponse represents template info in process context.
type ProcessTemplateInfoResponse struct {
	ID            string `json:"id"`
	Title         string `json:"title"`
	WorkspaceID   string `json:"workspaceId"`
	WorkspaceName string `json:"workspaceName"`
}

// CreateProcessRequest represents a request to create a process.
type CreateProcessRequest struct {
	Code        string            `json:"code" binding:"required,min=1,max=255"`
	ProcessType string            `json:"processType" binding:"required,oneof=ID CANONICAL_NAME"`
	Name        map[string]string `json:"name" binding:"required"`
	Description map[string]string `json:"description"`
}

// UpdateProcessRequest represents a request to update a process.
type UpdateProcessRequest struct {
	Name        map[string]string `json:"name" binding:"required"`
	Description map[string]string `json:"description"`
}

// DeleteProcessRequest represents a request to delete a process.
type DeleteProcessRequest struct {
	Force           bool    `json:"force"`                     // Delete even if templates are assigned
	ReplaceWithCode *string `json:"replaceWithCode,omitempty"` // Replace with another process code before deleting
}

// DeleteProcessResponse represents the result of a delete attempt.
type DeleteProcessResponse struct {
	Deleted    bool                           `json:"deleted"`
	Templates  []*ProcessTemplateInfoResponse `json:"templates,omitempty"`  // Templates using this process (if not deleted)
	CanReplace bool                           `json:"canReplace,omitempty"` // True if replacement is possible
}

// ProcessListRequest represents query params for listing processes.
type ProcessListRequest struct {
	Page    int    `form:"page,default=1"`
	PerPage int    `form:"perPage,default=10"`
	Query   string `form:"q"`
}

// PaginatedProcessesResponse represents a paginated list of processes.
type PaginatedProcessesResponse struct {
	Data       []*ProcessListItemResponse `json:"data"`
	Pagination PaginationMeta             `json:"pagination"`
}

// validateProcessCode checks if a process code meets all requirements.
// Process codes allow up to 255 characters (vs 50 for document type codes).
func validateProcessCode(code string) error {
	if code == "" {
		return ErrCodeRequired
	}
	if len(code) > 255 {
		return ErrCodeTooLong
	}
	if strings.Contains(code, "__") {
		return ErrCodeConsecutiveUnder
	}
	if strings.HasPrefix(code, "_") || strings.HasSuffix(code, "_") {
		return ErrCodeStartEndUnder
	}
	if !codeRegex.MatchString(code) {
		return ErrCodeInvalidFormat
	}
	return nil
}

// Validate validates the CreateProcessRequest.
// It normalizes the code (uppercase, spaces to underscores, remove invalid chars)
// and then validates it meets all requirements.
func (r *CreateProcessRequest) Validate() error {
	// Normalize code (spaces -> _, uppercase, remove invalid chars)
	r.Code = normalizeCode(r.Code)

	// Validate code
	if err := validateProcessCode(r.Code); err != nil {
		return err
	}

	// Validate name
	if len(r.Name) == 0 {
		return ErrNameRequired
	}
	// Check at least one name translation exists
	hasName := false
	for _, v := range r.Name {
		if v != "" {
			hasName = true
			break
		}
	}
	if !hasName {
		return ErrNameRequired
	}
	return nil
}

// Validate validates the UpdateProcessRequest.
func (r *UpdateProcessRequest) Validate() error {
	if len(r.Name) == 0 {
		return ErrNameRequired
	}
	hasName := false
	for _, v := range r.Name {
		if v != "" {
			hasName = true
			break
		}
	}
	if !hasName {
		return ErrNameRequired
	}
	return nil
}
