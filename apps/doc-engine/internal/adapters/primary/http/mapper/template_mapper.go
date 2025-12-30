package mapper

import (
	"github.com/doc-assembly/doc-engine/internal/adapters/primary/http/dto"
	"github.com/doc-assembly/doc-engine/internal/core/entity"
	"github.com/doc-assembly/doc-engine/internal/core/port"
	"github.com/doc-assembly/doc-engine/internal/core/usecase"
)

// TemplateMapper handles mapping between template entities and DTOs.
type TemplateMapper struct {
	versionMapper *TemplateVersionMapper
	tagMapper     *TagMapper
	folderMapper  *FolderMapper
}

// NewTemplateMapper creates a new template mapper.
func NewTemplateMapper(versionMapper *TemplateVersionMapper, tagMapper *TagMapper, folderMapper *FolderMapper) *TemplateMapper {
	return &TemplateMapper{
		versionMapper: versionMapper,
		tagMapper:     tagMapper,
		folderMapper:  folderMapper,
	}
}

// ToResponse converts a template entity to a response DTO.
func (m *TemplateMapper) ToResponse(template *entity.Template) *dto.TemplateResponse {
	if template == nil {
		return nil
	}

	return &dto.TemplateResponse{
		ID:              template.ID,
		WorkspaceID:     template.WorkspaceID,
		FolderID:        template.FolderID,
		Title:           template.Title,
		IsPublicLibrary: template.IsPublicLibrary,
		CreatedAt:       template.CreatedAt,
		UpdatedAt:       template.UpdatedAt,
	}
}

// ToListItemResponse converts a template list item to a response DTO.
func (m *TemplateMapper) ToListItemResponse(item *entity.TemplateListItem) *dto.TemplateListItemResponse {
	if item == nil {
		return nil
	}

	return &dto.TemplateListItemResponse{
		ID:                  item.ID,
		WorkspaceID:         item.WorkspaceID,
		FolderID:            item.FolderID,
		Title:               item.Title,
		IsPublicLibrary:     item.IsPublicLibrary,
		HasPublishedVersion: item.HasPublishedVersion,
		Tags:                m.toSimpleTagList(item.Tags),
		CreatedAt:           item.CreatedAt,
		UpdatedAt:           item.UpdatedAt,
	}
}

// toSimpleTagList converts a list of tag entities to simplified tag responses.
func (m *TemplateMapper) toSimpleTagList(tags []*entity.Tag) []*dto.TagSimpleResponse {
	if tags == nil {
		return []*dto.TagSimpleResponse{}
	}

	result := make([]*dto.TagSimpleResponse, len(tags))
	for i, tag := range tags {
		result[i] = &dto.TagSimpleResponse{
			ID:    tag.ID,
			Name:  tag.Name,
			Color: tag.Color,
		}
	}
	return result
}

// ToListItemResponseList converts a list of template list items to response DTOs.
func (m *TemplateMapper) ToListItemResponseList(items []*entity.TemplateListItem) []*dto.TemplateListItemResponse {
	if items == nil {
		return []*dto.TemplateListItemResponse{}
	}

	responses := make([]*dto.TemplateListItemResponse, len(items))
	for i, item := range items {
		responses[i] = m.ToListItemResponse(item)
	}
	return responses
}

// ToListResponse converts a list of template list items to a list response DTO.
func (m *TemplateMapper) ToListResponse(items []*entity.TemplateListItem, limit, offset int) *dto.ListTemplatesResponse {
	responses := m.ToListItemResponseList(items)
	return &dto.ListTemplatesResponse{
		Items:  responses,
		Total:  len(responses),
		Limit:  limit,
		Offset: offset,
	}
}

// ToDetailsResponse converts a template with details to a response DTO.
func (m *TemplateMapper) ToDetailsResponse(details *entity.TemplateWithDetails) *dto.TemplateWithDetailsResponse {
	if details == nil {
		return nil
	}

	resp := &dto.TemplateWithDetailsResponse{
		TemplateResponse: *m.ToResponse(&details.Template),
	}

	if details.PublishedVersion != nil {
		resp.PublishedVersion = m.versionMapper.ToDetailResponse(details.PublishedVersion)
	}

	if details.Tags != nil {
		resp.Tags = m.tagMapper.ToResponseList(details.Tags)
	}

	if details.Folder != nil {
		resp.Folder = m.folderMapper.ToResponse(details.Folder)
	}

	return resp
}

// ToAllVersionsResponse converts a template with all versions to a response DTO.
func (m *TemplateMapper) ToAllVersionsResponse(details *entity.TemplateWithAllVersions) *dto.TemplateWithAllVersionsResponse {
	if details == nil {
		return nil
	}

	resp := &dto.TemplateWithAllVersionsResponse{
		TemplateResponse: *m.ToResponse(&details.Template),
	}

	if details.Versions != nil {
		resp.Versions = m.versionMapper.ToSummaryResponseList(details.Versions)
	}

	if details.Tags != nil {
		resp.Tags = m.tagMapper.ToResponseList(details.Tags)
	}

	if details.Folder != nil {
		resp.Folder = m.folderMapper.ToResponse(details.Folder)
	}

	return resp
}

// ToCreateResponse converts a template and initial version to a create response DTO.
func (m *TemplateMapper) ToCreateResponse(template *entity.Template, version *entity.TemplateVersion) *dto.TemplateCreateResponse {
	return &dto.TemplateCreateResponse{
		Template:       m.ToResponse(template),
		InitialVersion: m.versionMapper.ToResponse(version),
	}
}

// ToCreateCommand converts a create request to a command.
func (m *TemplateMapper) ToCreateCommand(req *dto.CreateTemplateRequest, workspaceID string, userID string) usecase.CreateTemplateCommand {
	return usecase.CreateTemplateCommand{
		WorkspaceID:      workspaceID,
		FolderID:         req.FolderID,
		Title:            req.Title,
		ContentStructure: req.ContentStructure,
		IsPublicLibrary:  req.IsPublicLibrary,
		CreatedBy:        userID,
	}
}

// ToUpdateCommand converts an update request to a command.
func (m *TemplateMapper) ToUpdateCommand(id string, req *dto.UpdateTemplateRequest) usecase.UpdateTemplateCommand {
	return usecase.UpdateTemplateCommand{
		ID:              id,
		Title:           req.Title,
		FolderID:        req.FolderID,
		IsPublicLibrary: req.IsPublicLibrary,
	}
}

// ToCloneCommand converts a clone request to a command.
func (m *TemplateMapper) ToCloneCommand(sourceID string, req *dto.CloneTemplateRequest, userID string) usecase.CloneTemplateCommand {
	return usecase.CloneTemplateCommand{
		SourceTemplateID: sourceID,
		NewTitle:         req.NewTitle,
		TargetFolderID:   req.TargetFolderID,
		ClonedBy:         userID,
	}
}

// ToFilters converts filter request parameters to port filters.
func (m *TemplateMapper) ToFilters(req *dto.TemplateFiltersRequest) port.TemplateFilters {
	return port.TemplateFilters{
		FolderID:            req.FolderID,
		HasPublishedVersion: req.HasPublishedVersion,
		Search:              req.Search,
		TagIDs:              req.TagIDs,
		Limit:               req.Limit,
		Offset:              req.Offset,
	}
}
