package entity

import (
	"regexp"
	"time"
)

// injectableKeyRegex validates injectable key format (alphanumeric with underscores).
var injectableKeyRegex = regexp.MustCompile(`^[a-z][a-z0-9_]*$`)

// InjectableDefinition represents a variable that can be injected into templates.
type InjectableDefinition struct {
	ID          string               `json:"id"`
	WorkspaceID *string              `json:"workspaceId,omitempty"` // NULL for global definitions
	Key         string               `json:"key"`                   // Technical key (e.g., customer_name)
	Label       string               `json:"label"`                 // Human-readable name
	Description string               `json:"description,omitempty"`
	DataType    InjectableDataType   `json:"dataType"`
	SourceType  InjectableSourceType `json:"sourceType"` // INTERNAL (system-calculated) or EXTERNAL (user input)
	Metadata    map[string]any       `json:"metadata"`   // Flexible configuration (format options, etc.)
	CreatedAt   time.Time            `json:"createdAt"`
	UpdatedAt   *time.Time           `json:"updatedAt,omitempty"`
}

// NewInjectableDefinition creates a new injectable definition.
func NewInjectableDefinition(workspaceID *string, key, label string, dataType InjectableDataType) *InjectableDefinition {
	return &InjectableDefinition{
		WorkspaceID: workspaceID,
		Key:         key,
		Label:       label,
		DataType:    dataType,
		SourceType:  InjectableSourceTypeExternal,
		Metadata:    make(map[string]any),
		CreatedAt:   time.Now().UTC(),
	}
}

// IsGlobal returns true if this is a global definition (available to all workspaces).
func (i *InjectableDefinition) IsGlobal() bool {
	return i.WorkspaceID == nil
}

// Validate checks if the injectable definition data is valid.
func (i *InjectableDefinition) Validate() error {
	if i.Key == "" {
		return ErrRequiredField
	}
	if !injectableKeyRegex.MatchString(i.Key) {
		return ErrInvalidInjectableKey
	}
	if len(i.Key) > 100 {
		return ErrFieldTooLong
	}
	if i.Label == "" {
		return ErrRequiredField
	}
	if len(i.Label) > 255 {
		return ErrFieldTooLong
	}
	if !i.DataType.IsValid() {
		return ErrInvalidDataType
	}
	return nil
}

// TemplateVersionInjectable represents the configuration of a variable within a specific template version.
type TemplateVersionInjectable struct {
	ID                     string    `json:"id"`
	TemplateVersionID      string    `json:"templateVersionId"`
	InjectableDefinitionID string    `json:"injectableDefinitionId"`
	IsRequired             bool      `json:"isRequired"`
	DefaultValue           *string   `json:"defaultValue,omitempty"`
	CreatedAt              time.Time `json:"createdAt"`
}

// NewTemplateVersionInjectable creates a new template version injectable configuration.
func NewTemplateVersionInjectable(templateVersionID, injectableDefID string, isRequired bool, defaultValue *string) *TemplateVersionInjectable {
	return &TemplateVersionInjectable{
		TemplateVersionID:      templateVersionID,
		InjectableDefinitionID: injectableDefID,
		IsRequired:             isRequired,
		DefaultValue:           defaultValue,
		CreatedAt:              time.Now().UTC(),
	}
}

// Validate checks if the template version injectable data is valid.
func (tvi *TemplateVersionInjectable) Validate() error {
	if tvi.TemplateVersionID == "" || tvi.InjectableDefinitionID == "" {
		return ErrRequiredField
	}
	return nil
}

// VersionInjectableWithDefinition combines a template version injectable with its definition.
type VersionInjectableWithDefinition struct {
	TemplateVersionInjectable
	Definition *InjectableDefinition `json:"definition"`
}
