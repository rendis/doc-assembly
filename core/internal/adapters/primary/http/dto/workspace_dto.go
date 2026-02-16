package dto

import "time"

// WorkspaceResponse represents a workspace in API responses.
type WorkspaceResponse struct {
	ID             string         `json:"id"`
	TenantID       *string        `json:"tenantId,omitempty"`
	Name           string         `json:"name"`
	Type           string         `json:"type"`
	Status         string         `json:"status"`
	Settings       map[string]any `json:"settings,omitempty"`
	CreatedAt      time.Time      `json:"createdAt"`
	UpdatedAt      *time.Time     `json:"updatedAt,omitempty"`
	LastAccessedAt *time.Time     `json:"lastAccessedAt,omitempty"`
}

// CreateWorkspaceRequest represents a request to create a workspace.
type CreateWorkspaceRequest struct {
	TenantID *string        `json:"tenantId,omitempty"`
	Name     string         `json:"name" binding:"required,min=1,max=255"`
	Type     string         `json:"type" binding:"required,oneof=SYSTEM CLIENT"`
	Settings map[string]any `json:"settings,omitempty"`
}

// UpdateWorkspaceRequest represents a request to update a workspace.
type UpdateWorkspaceRequest struct {
	Name     string         `json:"name" binding:"required,min=1,max=255"`
	Settings map[string]any `json:"settings,omitempty"`
}

// Validate validates the CreateWorkspaceRequest.
func (r *CreateWorkspaceRequest) Validate() error {
	if r.Name == "" {
		return ErrNameRequired
	}
	if len(r.Name) > 255 {
		return ErrNameTooLong
	}
	validTypes := map[string]bool{
		"SYSTEM": true, "CLIENT": true,
	}
	if !validTypes[r.Type] {
		return ErrInvalidWorkspaceType
	}
	return nil
}

// Validate validates the UpdateWorkspaceRequest.
func (r *UpdateWorkspaceRequest) Validate() error {
	if r.Name == "" {
		return ErrNameRequired
	}
	if len(r.Name) > 255 {
		return ErrNameTooLong
	}
	return nil
}

// WorkspaceListRequest represents a request to list workspaces with pagination and optional search.
type WorkspaceListRequest struct {
	Page    int    `form:"page,default=1"`
	PerPage int    `form:"perPage,default=10"`
	Query   string `form:"q"`      // Optional search filter for name
	Status  string `form:"status"` // Optional status filter (ACTIVE, SUSPENDED, ARCHIVED)
}

// PaginatedWorkspacesResponse represents a paginated list of workspaces.
type PaginatedWorkspacesResponse struct {
	Data       []*WorkspaceResponse `json:"data"`
	Pagination PaginationMeta       `json:"pagination"`
}

// UpdateWorkspaceStatusRequest represents a request to update a workspace's status.
type UpdateWorkspaceStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=ACTIVE SUSPENDED ARCHIVED"`
}

// Validate validates the UpdateWorkspaceStatusRequest.
func (r *UpdateWorkspaceStatusRequest) Validate() error {
	switch r.Status {
	case "ACTIVE", "SUSPENDED", "ARCHIVED":
		return nil
	default:
		return ErrInvalidWorkspaceStatus
	}
}
