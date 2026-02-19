package entity

import (
	"encoding/json"
	"time"
)

// AutomationAPIKey represents an API key used for automation access.
type AutomationAPIKey struct {
	ID             string     `json:"id"`
	Name           string     `json:"name"`
	KeyHash        string     `json:"-"`              // SHA-256 hex (64 chars), never exposed
	KeyPrefix      string     `json:"keyPrefix"`      // first 12 chars of raw key for display
	AllowedTenants []string   `json:"allowedTenants"` // nil/empty = access to all tenants
	IsActive       bool       `json:"isActive"`
	CreatedBy      string     `json:"createdBy"`
	LastUsedAt     *time.Time `json:"lastUsedAt,omitempty"`
	CreatedAt      time.Time  `json:"createdAt"`
	RevokedAt      *time.Time `json:"revokedAt,omitempty"`
}

// IsRevoked returns true if the API key has been revoked.
func (k *AutomationAPIKey) IsRevoked() bool {
	return k.RevokedAt != nil
}

// CanAccessTenant returns true if the key has global access (AllowedTenants is nil/empty)
// or if the given tenantID is in AllowedTenants.
func (k *AutomationAPIKey) CanAccessTenant(tenantID string) bool {
	if len(k.AllowedTenants) == 0 {
		return true
	}
	for _, t := range k.AllowedTenants {
		if t == tenantID {
			return true
		}
	}
	return false
}

// AutomationAuditLog represents an audit log entry for automation API requests.
type AutomationAuditLog struct {
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
