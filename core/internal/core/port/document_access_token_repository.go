package port

import (
	"context"

	"github.com/rendis/doc-assembly/core/internal/core/entity"
)

// DocumentAccessTokenRepository defines the interface for document access token data access.
type DocumentAccessTokenRepository interface {
	// Create creates a new document access token.
	Create(ctx context.Context, token *entity.DocumentAccessToken) error

	// FindByToken finds an access token by its token string.
	FindByToken(ctx context.Context, token string) (*entity.DocumentAccessToken, error)

	// MarkAsUsed marks an access token as used by setting its used_at timestamp.
	MarkAsUsed(ctx context.Context, tokenID string) error

	// InvalidateByDocumentID invalidates all access tokens for a document
	// by setting their used_at timestamp (if not already used).
	InvalidateByDocumentID(ctx context.Context, documentID string) error
}
