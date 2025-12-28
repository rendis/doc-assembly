package dto

import "time"

// WorkspaceResponse represents a workspace in API responses.
type WorkspaceResponse struct {
	ID        string         `json:"id"`
	TenantID  *string        `json:"tenantId,omitempty"`
	Name      string         `json:"name"`
	Type      string         `json:"type"`
	Status    string         `json:"status"`
	Settings  map[string]any `json:"settings,omitempty"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt *time.Time     `json:"updatedAt,omitempty"`
}

// WorkspaceWithRoleResponse includes the user's role in the workspace.
type WorkspaceWithRoleResponse struct {
	WorkspaceResponse
	Role string `json:"role"`
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
