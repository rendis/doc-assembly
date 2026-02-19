package dto

import (
	"encoding/json"
	"time"
)

// CreateAutomationKeyRequest is the request body for POST /admin/automation-keys.
type CreateAutomationKeyRequest struct {
	Name           string   `json:"name"           binding:"required"`
	AllowedTenants []string `json:"allowedTenants"`
}

// CreateAutomationKeyResponse includes the raw key returned ONCE on creation.
type CreateAutomationKeyResponse struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	KeyPrefix      string    `json:"keyPrefix"`
	AllowedTenants []string  `json:"allowedTenants"`
	IsActive       bool      `json:"isActive"`
	CreatedBy      string    `json:"createdBy"`
	CreatedAt      time.Time `json:"createdAt"`
	RawKey         string    `json:"rawKey"` // shown exactly once
}

// AutomationKeyResponse is the standard API key representation (no raw key).
type AutomationKeyResponse struct {
	ID             string     `json:"id"`
	Name           string     `json:"name"`
	KeyPrefix      string     `json:"keyPrefix"`
	AllowedTenants []string   `json:"allowedTenants"`
	IsActive       bool       `json:"isActive"`
	CreatedBy      string     `json:"createdBy"`
	LastUsedAt     *time.Time `json:"lastUsedAt,omitempty"`
	CreatedAt      time.Time  `json:"createdAt"`
	RevokedAt      *time.Time `json:"revokedAt,omitempty"`
}

// UpdateAutomationKeyRequest is the request body for PATCH /admin/automation-keys/:id.
type UpdateAutomationKeyRequest struct {
	Name           *string  `json:"name"`
	AllowedTenants []string `json:"allowedTenants"`
}

// AutomationAuditLogResponse is a single audit log entry in a listing response.
type AutomationAuditLogResponse struct {
	ID             string          `json:"id"`
	APIKeyID       string          `json:"apiKeyId"`
	APIKeyPrefix   string          `json:"apiKeyPrefix"`
	Method         string          `json:"method"`
	Path           string          `json:"path"`
	TenantID       *string         `json:"tenantId,omitempty"`
	WorkspaceID    *string         `json:"workspaceId,omitempty"`
	ResourceType   *string         `json:"resourceType,omitempty"`
	ResourceID     *string         `json:"resourceId,omitempty"`
	Action         *string         `json:"action,omitempty"`
	RequestBody    json.RawMessage `json:"requestBody,omitempty"`
	ResponseStatus int             `json:"responseStatus"`
	CreatedAt      time.Time       `json:"createdAt"`
}

// AutomationCreateWorkspaceRequest is the request body for POST /automation/tenants/:tenantId/workspaces.
type AutomationCreateWorkspaceRequest struct {
	Name        string `json:"name"        binding:"required"`
	Code        string `json:"code"` // Optional; auto-generated from name if not provided.
	Description string `json:"description"`
}

// AutomationCreateTemplateRequest is the request body for POST /automation/workspaces/:workspaceId/templates.
type AutomationCreateTemplateRequest struct {
	Name        string `json:"name"        binding:"required"`
	Description string `json:"description"`
}

// AutomationUpdateTemplateRequest is the request body for PATCH /automation/workspaces/:workspaceId/templates/:templateId.
type AutomationUpdateTemplateRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
}

// AutomationAssignDocumentTypeRequest is the request body for POST /automation/templates/:templateId/document-type.
type AutomationAssignDocumentTypeRequest struct {
	DocumentTypeID string `json:"documentTypeId" binding:"required"`
}

// AutomationCreateVersionRequest is the request body for POST /automation/templates/:templateId/versions.
type AutomationCreateVersionRequest struct {
	Name        string `json:"name"        binding:"required"`
	Description string `json:"description"`
}

// AutomationUpdateVersionRequest is the request body for PATCH /automation/templates/:templateId/versions/:versionId.
// Only name and description can be updated this way; content is updated via PUT .../content.
type AutomationUpdateVersionRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
}

// AutomationUpdateVersionContentRequest is the request body for PUT .../versions/:versionId/content.
type AutomationUpdateVersionContentRequest struct {
	ContentStructure json.RawMessage `json:"contentStructure" binding:"required"`
}
