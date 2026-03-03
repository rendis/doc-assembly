package middleware

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	"github.com/rendis/doc-assembly/core/internal/core/entity"
	"github.com/rendis/doc-assembly/core/internal/core/port"
)

// APIKeyHeader is the HTTP header name for API key authentication.
const APIKeyHeader = "X-API-Key" //nolint:gosec // This is a header name, not a credential

// hashAPIKey returns the hex-encoded SHA-256 of rawKey.
func hashAPIKey(rawKey string) string {
	sum := sha256.Sum256([]byte(rawKey))
	return hex.EncodeToString(sum[:])
}

// InternalKeyAuth creates a middleware that validates an internal API key
// against the database. Uses SHA-256 hashing for key lookup.
func InternalKeyAuth(keyRepo port.AutomationAPIKeyRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		rawKey := c.GetHeader(APIKeyHeader)
		if rawKey == "" {
			abortWithError(c, http.StatusUnauthorized, entity.ErrMissingAPIKey)
			return
		}

		keyHash := hashAPIKey(rawKey)

		key, err := keyRepo.FindByHash(c.Request.Context(), keyHash)
		if err != nil || key == nil {
			abortWithError(c, http.StatusUnauthorized, entity.ErrInvalidAPIKey)
			return
		}

		// Defence-in-depth: verify active status, revocation, and key type
		if !key.IsActive || key.IsRevoked() || key.KeyType != entity.KeyTypeInternal {
			abortWithError(c, http.StatusUnauthorized, entity.ErrInvalidAPIKey)
			return
		}

		// Fire and forget: update last used timestamp with bounded timeout
		// to prevent goroutine/connection leaks under load.
		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
			defer cancel()
			_ = keyRepo.TouchLastUsed(ctx, key.ID)
		}()

		c.Next()
	}
}
