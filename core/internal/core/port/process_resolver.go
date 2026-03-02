package port

import "context"

// ProcessInfo describes a process available for a tenant.
type ProcessInfo struct {
	Process     string `json:"process"`
	ProcessType string `json:"processType"`
	Label       string `json:"label"`
}

// ProcessResolver provides process discovery and validation.
// Implementations can resolve processes from tenant configuration or custom user functions.
type ProcessResolver interface {
	// ListProcesses returns the available processes for a tenant.
	ListProcesses(ctx context.Context, tenantID string) ([]ProcessInfo, error)

	// ValidateProcess checks whether a process value is valid for the tenant.
	ValidateProcess(ctx context.Context, tenantID, process, processType string) error
}
