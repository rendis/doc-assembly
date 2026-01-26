package operation

import "github.com/doc-assembly/signing-worker/internal/port"

// Registry holds all registered operation strategies.
type Registry struct {
	strategies map[string]port.OperationStrategy
}

// NewRegistry creates a new operation registry with all strategies registered.
func NewRegistry() *Registry {
	r := &Registry{
		strategies: make(map[string]port.OperationStrategy),
	}

	// Register available strategies
	r.Register(&UploadStrategy{})

	return r
}

// Register adds a strategy to the registry.
func (r *Registry) Register(s port.OperationStrategy) {
	r.strategies[s.OperationType()] = s
}

// Get returns the strategy for the given status, or nil if not found.
func (r *Registry) Get(status string) (port.OperationStrategy, bool) {
	s, ok := r.strategies[status]
	return s, ok
}
