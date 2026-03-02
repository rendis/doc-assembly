package entity

import (
	"strings"
	"time"
)

// Process represents a tenant-scoped process classification.
// Templates can be assigned to a process for categorization.
type Process struct {
	ID          string      `json:"id"`
	TenantID    string      `json:"tenantId"`
	Code        string      `json:"code"`        // Immutable, unique per tenant, max 255
	ProcessType ProcessType `json:"processType"` // Immutable after creation
	Name        I18nText    `json:"name"`        // {"en": "...", "es": "..."}
	Description I18nText    `json:"description"` // Optional
	IsGlobal    bool        `json:"isGlobal"`    // True if from SYS tenant (read-only for other tenants)
	CreatedAt   time.Time   `json:"createdAt"`
	UpdatedAt   *time.Time  `json:"updatedAt,omitempty"`
}

// NewProcess creates a new process.
func NewProcess(tenantID, code string, processType ProcessType, name, description I18nText) *Process {
	return &Process{
		TenantID:    tenantID,
		Code:        code,
		ProcessType: processType,
		Name:        name,
		Description: description,
		CreatedAt:   time.Now().UTC(),
	}
}

// Validate checks if the process data is valid.
func (p *Process) Validate() error {
	if p.TenantID == "" {
		return ErrRequiredField
	}
	p.Code = strings.TrimSpace(p.Code)
	if p.Code == "" {
		return ErrRequiredField
	}
	if len(p.Code) > 255 {
		return ErrFieldTooLong
	}
	if !p.ProcessType.IsValid() {
		return ErrInvalidProcessType
	}
	if len(p.Name) == 0 {
		return ErrRequiredField
	}
	// Check at least one name translation exists
	hasName := false
	for _, v := range p.Name {
		if v != "" {
			hasName = true
			break
		}
	}
	if !hasName {
		return ErrRequiredField
	}
	return nil
}

// GetName returns the name for the given locale with fallback to "en" or first available.
func (p *Process) GetName(locale string) string {
	if name, ok := p.Name[locale]; ok && name != "" {
		return name
	}
	if name, ok := p.Name["en"]; ok && name != "" {
		return name
	}
	for _, name := range p.Name {
		if name != "" {
			return name
		}
	}
	return p.Code
}

// GetDescription returns the description for the given locale with fallback.
func (p *Process) GetDescription(locale string) string {
	if desc, ok := p.Description[locale]; ok {
		return desc
	}
	if desc, ok := p.Description["en"]; ok {
		return desc
	}
	for _, desc := range p.Description {
		return desc
	}
	return ""
}

// ProcessListItem represents a process in list views.
type ProcessListItem struct {
	ID             string      `json:"id"`
	TenantID       string      `json:"tenantId"`
	Code           string      `json:"code"`
	ProcessType    ProcessType `json:"processType"`
	Name           I18nText    `json:"name"`
	Description    I18nText    `json:"description"`
	IsGlobal       bool        `json:"isGlobal"`       // True if from SYS tenant
	TemplatesCount int         `json:"templatesCount"` // Number of templates using this process
	CreatedAt      time.Time   `json:"createdAt"`
	UpdatedAt      *time.Time  `json:"updatedAt,omitempty"`
}

// ProcessTemplateInfo represents basic template info for process context.
type ProcessTemplateInfo struct {
	ID            string `json:"id"`
	Title         string `json:"title"`
	WorkspaceID   string `json:"workspaceId"`
	WorkspaceName string `json:"workspaceName"`
}
