package mapper

import (
	"github.com/rendis/doc-assembly/core/internal/adapters/primary/http/dto"
	"github.com/rendis/doc-assembly/core/internal/core/entity"
	"github.com/rendis/doc-assembly/core/internal/core/port"
	organizationuc "github.com/rendis/doc-assembly/core/internal/core/usecase/organization"
)

// WorkspaceToResponse converts a Workspace entity to a response DTO.
func WorkspaceToResponse(ws *entity.Workspace) dto.WorkspaceResponse {
	settings := map[string]any{
		"theme":        ws.Settings.Theme,
		"logoUrl":      ws.Settings.LogoURL,
		"primaryColor": ws.Settings.PrimaryColor,
	}
	return dto.WorkspaceResponse{
		ID:             ws.ID,
		TenantID:       ws.TenantID,
		Name:           ws.Name,
		Type:           string(ws.Type),
		Status:         string(ws.Status),
		Settings:       settings,
		CreatedAt:      ws.CreatedAt,
		UpdatedAt:      ws.UpdatedAt,
		LastAccessedAt: ws.LastAccessedAt,
	}
}

// WorkspacesToResponses converts a slice of Workspace entities to response DTOs.
func WorkspacesToResponses(workspaces []*entity.Workspace) []dto.WorkspaceResponse {
	result := make([]dto.WorkspaceResponse, len(workspaces))
	for i, ws := range workspaces {
		result[i] = WorkspaceToResponse(ws)
	}
	return result
}

// CreateWorkspaceRequestToCommand converts a create request to a usecase command.
func CreateWorkspaceRequestToCommand(req dto.CreateWorkspaceRequest, createdBy string) organizationuc.CreateWorkspaceCommand {
	settings := entity.WorkspaceSettings{}
	if req.Settings != nil {
		if theme, ok := req.Settings["theme"].(string); ok {
			settings.Theme = theme
		}
		if logoURL, ok := req.Settings["logoUrl"].(string); ok {
			settings.LogoURL = logoURL
		}
		if primaryColor, ok := req.Settings["primaryColor"].(string); ok {
			settings.PrimaryColor = primaryColor
		}
	}
	return organizationuc.CreateWorkspaceCommand{
		TenantID:  req.TenantID,
		Name:      req.Name,
		Type:      entity.WorkspaceType(req.Type),
		Settings:  settings,
		CreatedBy: createdBy,
	}
}

// UpdateWorkspaceRequestToCommand converts an update request to a usecase command.
func UpdateWorkspaceRequestToCommand(id string, req dto.UpdateWorkspaceRequest) organizationuc.UpdateWorkspaceCommand {
	settings := entity.WorkspaceSettings{}
	if req.Settings != nil {
		if theme, ok := req.Settings["theme"].(string); ok {
			settings.Theme = theme
		}
		if logoURL, ok := req.Settings["logoUrl"].(string); ok {
			settings.LogoURL = logoURL
		}
		if primaryColor, ok := req.Settings["primaryColor"].(string); ok {
			settings.PrimaryColor = primaryColor
		}
	}
	return organizationuc.UpdateWorkspaceCommand{
		ID:       id,
		Name:     req.Name,
		Settings: settings,
	}
}

// WorkspaceListRequestToFilters converts a list request to port filters.
func WorkspaceListRequestToFilters(req dto.WorkspaceListRequest) port.WorkspaceFilters {
	offset := (req.Page - 1) * req.PerPage
	return port.WorkspaceFilters{
		Limit:  req.PerPage,
		Offset: offset,
		Query:  req.Query,
		Status: req.Status,
	}
}

// WorkspacesToPaginatedResponse converts workspaces to a paginated response.
func WorkspacesToPaginatedResponse(workspaces []*entity.Workspace, total int64, page, perPage int) *dto.PaginatedWorkspacesResponse {
	responses := make([]*dto.WorkspaceResponse, len(workspaces))
	for i, ws := range workspaces {
		resp := WorkspaceToResponse(ws)
		responses[i] = &resp
	}

	totalPages := int(total) / perPage
	if int(total)%perPage > 0 {
		totalPages++
	}

	return &dto.PaginatedWorkspacesResponse{
		Data: responses,
		Pagination: dto.PaginationMeta{
			Page:       page,
			PerPage:    perPage,
			Total:      total,
			TotalPages: totalPages,
		},
	}
}
