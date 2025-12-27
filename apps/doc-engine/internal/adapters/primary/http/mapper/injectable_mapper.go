package mapper

import (
	"github.com/doc-assembly/doc-engine/internal/adapters/primary/http/dto"
	"github.com/doc-assembly/doc-engine/internal/core/entity"
	"github.com/doc-assembly/doc-engine/internal/core/usecase"
)

// InjectableMapper handles mapping between injectable entities and DTOs.
type InjectableMapper struct{}

// NewInjectableMapper creates a new injectable mapper.
func NewInjectableMapper() *InjectableMapper {
	return &InjectableMapper{}
}

// ToResponse converts an injectable entity to a response DTO.
func (m *InjectableMapper) ToResponse(injectable *entity.InjectableDefinition) *dto.InjectableResponse {
	if injectable == nil {
		return nil
	}

	return &dto.InjectableResponse{
		ID:          injectable.ID,
		WorkspaceID: injectable.WorkspaceID,
		Key:         injectable.Key,
		Label:       injectable.Label,
		Description: injectable.Description,
		DataType:    string(injectable.DataType),
		IsGlobal:    injectable.IsGlobal(),
		CreatedAt:   injectable.CreatedAt,
		UpdatedAt:   injectable.UpdatedAt,
	}
}

// ToResponseList converts a list of injectable entities to response DTOs.
func (m *InjectableMapper) ToResponseList(injectables []*entity.InjectableDefinition) []*dto.InjectableResponse {
	if injectables == nil {
		return []*dto.InjectableResponse{}
	}

	responses := make([]*dto.InjectableResponse, len(injectables))
	for i, injectable := range injectables {
		responses[i] = m.ToResponse(injectable)
	}
	return responses
}

// ToListResponse converts a list of injectable entities to a list response DTO.
func (m *InjectableMapper) ToListResponse(injectables []*entity.InjectableDefinition) *dto.ListInjectablesResponse {
	items := m.ToResponseList(injectables)
	return &dto.ListInjectablesResponse{
		Items: items,
		Total: len(items),
	}
}

// ToCreateCommand converts a create request to a command.
func (m *InjectableMapper) ToCreateCommand(req *dto.CreateInjectableRequest, workspaceID string) usecase.CreateInjectableCommand {
	cmd := usecase.CreateInjectableCommand{
		Key:         req.Key,
		Label:       req.Label,
		Description: req.Description,
		DataType:    entity.InjectableDataType(req.DataType),
	}

	if req.IsGlobal {
		cmd.WorkspaceID = nil
	} else {
		cmd.WorkspaceID = &workspaceID
	}

	return cmd
}

// ToUpdateCommand converts an update request to a command.
func (m *InjectableMapper) ToUpdateCommand(id string, req *dto.UpdateInjectableRequest) usecase.UpdateInjectableCommand {
	return usecase.UpdateInjectableCommand{
		ID:          id,
		Label:       req.Label,
		Description: req.Description,
	}
}

// VersionInjectableToResponse converts a version injectable with definition to a response DTO.
func (m *InjectableMapper) VersionInjectableToResponse(iwd *entity.VersionInjectableWithDefinition) *dto.TemplateVersionInjectableResponse {
	if iwd == nil {
		return nil
	}

	return &dto.TemplateVersionInjectableResponse{
		ID:                iwd.TemplateVersionInjectable.ID,
		TemplateVersionID: iwd.TemplateVersionInjectable.TemplateVersionID,
		IsRequired:        iwd.TemplateVersionInjectable.IsRequired,
		DefaultValue:      iwd.TemplateVersionInjectable.DefaultValue,
		Definition:        m.ToResponse(iwd.Definition),
		CreatedAt:         iwd.TemplateVersionInjectable.CreatedAt,
	}
}

// VersionInjectablesToResponse converts a list of version injectables to response DTOs.
func (m *InjectableMapper) VersionInjectablesToResponse(injectables []*entity.VersionInjectableWithDefinition) []*dto.TemplateVersionInjectableResponse {
	if injectables == nil {
		return []*dto.TemplateVersionInjectableResponse{}
	}

	responses := make([]*dto.TemplateVersionInjectableResponse, len(injectables))
	for i, iwd := range injectables {
		responses[i] = m.VersionInjectableToResponse(iwd)
	}
	return responses
}
