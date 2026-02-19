package documentaccesstokenrepo

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/rendis/doc-assembly/core/internal/core/entity"
	"github.com/rendis/doc-assembly/core/internal/core/port"
)

// New creates a new document access token repository.
func New(pool *pgxpool.Pool) port.DocumentAccessTokenRepository {
	return &Repository{pool: pool}
}

// Repository implements port.DocumentAccessTokenRepository using PostgreSQL.
type Repository struct {
	pool *pgxpool.Pool
}

// Create creates a new document access token.
func (r *Repository) Create(ctx context.Context, token *entity.DocumentAccessToken) error {
	_, err := r.pool.Exec(ctx, queryCreate,
		token.DocumentID,
		token.RecipientID,
		token.Token,
		token.ExpiresAt,
		token.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("creating document access token: %w", err)
	}
	return nil
}

// FindByToken finds an access token by its token string.
func (r *Repository) FindByToken(ctx context.Context, token string) (*entity.DocumentAccessToken, error) {
	row := r.pool.QueryRow(ctx, queryFindByAccessValue, token)

	t := &entity.DocumentAccessToken{}
	err := row.Scan(
		&t.ID,
		&t.DocumentID,
		&t.RecipientID,
		&t.Token,
		&t.ExpiresAt,
		&t.UsedAt,
		&t.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, entity.ErrRecordNotFound
		}
		return nil, fmt.Errorf("finding document access token: %w", err)
	}

	return t, nil
}

// MarkAsUsed marks an access token as used by setting its used_at timestamp.
func (r *Repository) MarkAsUsed(ctx context.Context, tokenID string) error {
	_, err := r.pool.Exec(ctx, queryMarkAsUsed, tokenID)
	if err != nil {
		return fmt.Errorf("marking document access token as used: %w", err)
	}
	return nil
}

// InvalidateByDocumentID invalidates all access tokens for a document.
func (r *Repository) InvalidateByDocumentID(ctx context.Context, documentID string) error {
	_, err := r.pool.Exec(ctx, queryInvalidateByDocumentID, documentID)
	if err != nil {
		return fmt.Errorf("invalidating document access tokens: %w", err)
	}
	return nil
}
