package mapper

import (
	"github.com/doc-assembly/doc-engine/internal/adapters/primary/http/dto"
	"github.com/doc-assembly/doc-engine/internal/core/entity"
	"github.com/doc-assembly/doc-engine/internal/core/port"
	"github.com/doc-assembly/doc-engine/internal/core/usecase"
)

// WorkspaceToResponse converts a Workspace entity to a response DTO.
func WorkspaceToResponse(ws *entity.Workspace) dto.WorkspaceResponse {
	settings := map[string]any{
		"theme":        ws.Settings.Theme,
		"logoUrl":      ws.Settings.LogoURL,
		"primaryColor": ws.Settings.PrimaryColor,
	}
	return dto.WorkspaceResponse{
		ID:        ws.ID,
		TenantID:  ws.TenantID,
		Name:      ws.Name,
		Type:      string(ws.Type),
		Status:    string(ws.Status),
		Settings:  settings,
		CreatedAt: ws.CreatedAt,
		UpdatedAt: ws.UpdatedAt,
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
func CreateWorkspaceRequestToCommand(req dto.CreateWorkspaceRequest, createdBy string) usecase.CreateWorkspaceCommand {
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
	return usecase.CreateWorkspaceCommand{
		TenantID:  req.TenantID,
		Name:      req.Name,
		Type:      entity.WorkspaceType(req.Type),
		Settings:  settings,
		CreatedBy: createdBy,
	}
}

// UpdateWorkspaceRequestToCommand converts an update request to a usecase command.
func UpdateWorkspaceRequestToCommand(id string, req dto.UpdateWorkspaceRequest) usecase.UpdateWorkspaceCommand {
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
	return usecase.UpdateWorkspaceCommand{
		ID:       id,
		Name:     req.Name,
		Settings: settings,
	}
}

// WorkspaceListRequestToFilters converts a list request to port filters.
func WorkspaceListRequestToFilters(req dto.WorkspaceListRequest) port.WorkspaceFilters {
	return port.WorkspaceFilters{
		Limit:  req.Limit,
		Offset: req.Offset,
	}
}

// WorkspacesToPaginatedResponse converts workspaces to a paginated response.
func WorkspacesToPaginatedResponse(workspaces []*entity.Workspace, total int64, limit, offset int) *dto.PaginatedWorkspacesResponse {
	responses := make([]*dto.WorkspaceResponse, len(workspaces))
	for i, ws := range workspaces {
		resp := WorkspaceToResponse(ws)
		responses[i] = &resp
	}

	totalPages := int(total) / limit
	if int(total)%limit > 0 {
		totalPages++
	}

	page := 1
	if limit > 0 {
		page = (offset / limit) + 1
	}

	return &dto.PaginatedWorkspacesResponse{
		Data: responses,
		Pagination: dto.PaginationMeta{
			Page:       page,
			PerPage:    limit,
			Total:      total,
			TotalPages: totalPages,
		},
	}
}
