package contentvalidator

import (
	"context"

	"github.com/doc-assembly/doc-engine/internal/core/port"
)

// Service implements the ContentValidator interface.
type Service struct {
	injectableRepo  port.InjectableRepository
	maxNestingDepth int
	strictMode      bool
}

// Option configures the validator service.
type Option func(*Service)

// WithStrictMode enables strict validation mode.
// In strict mode, warnings are treated as errors.
func WithStrictMode() Option {
	return func(s *Service) {
		s.strictMode = true
	}
}

// WithMaxNestingDepth sets the maximum conditional nesting depth.
// Default is 3.
func WithMaxNestingDepth(depth int) Option {
	return func(s *Service) {
		if depth > 0 {
			s.maxNestingDepth = depth
		}
	}
}

// New creates a new content validator service.
func New(injectableRepo port.InjectableRepository, opts ...Option) *Service {
	s := &Service{
		injectableRepo:  injectableRepo,
		maxNestingDepth: 3, // default
		strictMode:      false,
	}

	for _, opt := range opts {
		opt(s)
	}

	return s
}

// ValidateForDraft performs minimal validation for draft mode.
func (s *Service) ValidateForDraft(ctx context.Context, content []byte) *port.ContentValidationResult {
	return validateDraft(content)
}

// ValidateForPublish performs complete validation for publish mode.
func (s *Service) ValidateForPublish(
	ctx context.Context,
	workspaceID, versionID string,
	content []byte,
) *port.ContentValidationResult {
	return s.validatePublish(ctx, workspaceID, versionID, content)
}

// Ensure Service implements ContentValidator interface.
var _ port.ContentValidator = (*Service)(nil)
