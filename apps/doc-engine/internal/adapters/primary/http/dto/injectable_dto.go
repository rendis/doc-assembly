package dto

import (
	"encoding/json"
	"time"
)

// InjectableResponse represents an injectable definition in API responses.
type InjectableResponse struct {
	ID          string     `json:"id"`
	WorkspaceID *string    `json:"workspaceId,omitempty"`
	Key         string     `json:"key"`
	Label       string     `json:"label"`
	Description string     `json:"description,omitempty"`
	DataType    string     `json:"dataType"`
	IsGlobal    bool       `json:"isGlobal"`
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   *time.Time `json:"updatedAt,omitempty"`
}

// CreateInjectableRequest represents the request to create an injectable.
type CreateInjectableRequest struct {
	Key         string `json:"key" binding:"required,min=1,max=100"`
	Label       string `json:"label" binding:"required,min=1,max=255"`
	Description string `json:"description,omitempty"`
	DataType    string `json:"dataType" binding:"required,oneof=TEXT NUMBER DATE CURRENCY BOOLEAN IMAGE TABLE"`
	IsGlobal    bool   `json:"isGlobal"` // Only allowed for global admins
}

// UpdateInjectableRequest represents the request to update an injectable.
type UpdateInjectableRequest struct {
	Label       string `json:"label" binding:"required,min=1,max=255"`
	Description string `json:"description,omitempty"`
}

// ListInjectablesResponse represents the list of injectables.
type ListInjectablesResponse struct {
	Items []*InjectableResponse `json:"items"`
	Total int                   `json:"total"`
}


// TemplateResponse represents a template in API responses (metadata only).
type TemplateResponse struct {
	ID              string     `json:"id"`
	WorkspaceID     string     `json:"workspaceId"`
	FolderID        *string    `json:"folderId,omitempty"`
	Title           string     `json:"title"`
	IsPublicLibrary bool       `json:"isPublicLibrary"`
	CreatedAt       time.Time  `json:"createdAt"`
	UpdatedAt       *time.Time `json:"updatedAt,omitempty"`
}

// TemplateListItemResponse represents a template in list views.
type TemplateListItemResponse struct {
	ID                  string     `json:"id"`
	WorkspaceID         string     `json:"workspaceId"`
	FolderID            *string    `json:"folderId,omitempty"`
	Title               string     `json:"title"`
	IsPublicLibrary     bool       `json:"isPublicLibrary"`
	HasPublishedVersion bool       `json:"hasPublishedVersion"`
	TagCount            int        `json:"tagCount"`
	CreatedAt           time.Time  `json:"createdAt"`
	UpdatedAt           *time.Time `json:"updatedAt,omitempty"`
}

// TemplateWithDetailsResponse represents a template with published version and metadata.
type TemplateWithDetailsResponse struct {
	TemplateResponse
	PublishedVersion *TemplateVersionDetailResponse `json:"publishedVersion,omitempty"`
	Tags             []*TagResponse                 `json:"tags,omitempty"`
	Folder           *FolderResponse                `json:"folder,omitempty"`
}

// TemplateWithAllVersionsResponse represents a template with all its versions.
type TemplateWithAllVersionsResponse struct {
	TemplateResponse
	Versions []*TemplateVersionDetailResponse `json:"versions,omitempty"`
	Tags     []*TagResponse                   `json:"tags,omitempty"`
	Folder   *FolderResponse                  `json:"folder,omitempty"`
}

// TemplateCreateResponse represents the response when creating a template (with initial version).
type TemplateCreateResponse struct {
	Template       *TemplateResponse        `json:"template"`
	InitialVersion *TemplateVersionResponse `json:"initialVersion"`
}

// CreateTemplateRequest represents the request to create a template.
type CreateTemplateRequest struct {
	Title            string          `json:"title" binding:"required,min=1,max=255"`
	FolderID         *string         `json:"folderId,omitempty"`
	ContentStructure json.RawMessage `json:"contentStructure,omitempty"` // Initial content for the first version
	IsPublicLibrary  bool            `json:"isPublicLibrary"`
}

// UpdateTemplateRequest represents the request to update a template's metadata.
type UpdateTemplateRequest struct {
	Title           string  `json:"title" binding:"required,min=1,max=255"`
	FolderID        *string `json:"folderId,omitempty"`
	IsPublicLibrary bool    `json:"isPublicLibrary"`
}

// CloneTemplateRequest represents the request to clone a template.
type CloneTemplateRequest struct {
	NewTitle       string  `json:"newTitle" binding:"required,min=1,max=255"`
	TargetFolderID *string `json:"targetFolderId,omitempty"`
}

// ListTemplatesResponse represents the list of templates.
type ListTemplatesResponse struct {
	Items  []*TemplateListItemResponse `json:"items"`
	Total  int                         `json:"total"`
	Limit  int                         `json:"limit,omitempty"`
	Offset int                         `json:"offset,omitempty"`
}

// AddTagsRequest represents the request to add tags to a template.
type AddTagsRequest struct {
	TagIDs []string `json:"tagIds" binding:"required,min=1"`
}

// TemplateFiltersRequest represents filter parameters for listing templates.
type TemplateFiltersRequest struct {
	FolderID            *string  `form:"folderId"`
	HasPublishedVersion *bool    `form:"hasPublishedVersion"`
	TagIDs              []string `form:"tagIds"`
	Search              string   `form:"search"`
	Limit               int      `form:"limit,default=50"`
	Offset              int      `form:"offset,default=0"`
}
