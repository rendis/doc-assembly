package entity

import (
	"regexp"
	"time"
)

// hexColorRegex validates hex color format (#RRGGBB).
var hexColorRegex = regexp.MustCompile(`^#[0-9A-Fa-f]{6}$`)

// Tag represents a cross-cutting label for categorizing templates.
type Tag struct {
	ID          string     `json:"id"`
	WorkspaceID string     `json:"workspaceId"`
	Name        string     `json:"name"`
	Color       string     `json:"color"` // Hex format: #RRGGBB
	CreatedAt   time.Time  `json:"createdAt"`
	UpdatedAt   *time.Time `json:"updatedAt,omitempty"`
}

// NewTag creates a new tag with a default color if not provided.
func NewTag(workspaceID, name, color string) *Tag {
	if color == "" {
		color = "#3B82F6" // Default blue
	}
	return &Tag{
		WorkspaceID: workspaceID,
		Name:        name,
		Color:       color,
		CreatedAt:   time.Now().UTC(),
	}
}

// Validate checks if the tag data is valid.
func (t *Tag) Validate() error {
	if t.WorkspaceID == "" {
		return ErrRequiredField
	}
	if t.Name == "" {
		return ErrRequiredField
	}
	if len(t.Name) > 50 {
		return ErrFieldTooLong
	}
	if t.Color != "" && !hexColorRegex.MatchString(t.Color) {
		return ErrInvalidTagColor
	}
	return nil
}

// TagWithCount represents a tag with its template usage count.
// Used for tag listings with statistics.
type TagWithCount struct {
	Tag
	TemplateCount int `json:"templateCount"`
}

// WorkspaceTagsCache represents cached tag data for quick access.
// Mirrors the organizer.workspace_tags_cache table.
type WorkspaceTagsCache struct {
	TagID         string    `json:"tagId"`
	WorkspaceID   string    `json:"workspaceId"`
	TagName       string    `json:"tagName"`
	TagColor      string    `json:"tagColor"`
	TemplateCount int       `json:"templateCount"`
	TagCreatedAt  time.Time `json:"tagCreatedAt"`
}
