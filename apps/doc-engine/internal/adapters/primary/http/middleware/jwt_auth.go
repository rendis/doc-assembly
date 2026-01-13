package middleware

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
	"time"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"

	"github.com/doc-assembly/doc-engine/internal/core/entity"
	"github.com/doc-assembly/doc-engine/internal/infra/config"
)

const (
	// userIDKey is the context key for the authenticated user ID.
	userIDKey = "user_id"
	// userEmailKey is the context key for the authenticated user email.
	userEmailKey = "user_email"
	// userNameKey is the context key for the authenticated user name.
	userNameKey = "user_name"
)

// JWTAuth creates a middleware that validates JWT tokens using JWKS from Keycloak.
func JWTAuth(authCfg *config.AuthConfig) gin.HandlerFunc {
	// Initialize JWKS keyfunc
	var jwks keyfunc.Keyfunc
	var jwksErr error

	if authCfg.JWKSURL != "" {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		jwks, jwksErr = keyfunc.NewDefaultCtx(ctx, []string{authCfg.JWKSURL})
		if jwksErr != nil {
			slog.ErrorContext(ctx, "failed to initialize JWKS", slog.String("error", jwksErr.Error()))
		}
	}

	return func(c *gin.Context) {
		// Skip auth for OPTIONS requests (CORS preflight)
		if c.Request.Method == http.MethodOptions {
			c.Next()
			return
		}

		// Get Authorization header
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			abortWithError(c, http.StatusUnauthorized, entity.ErrMissingToken)
			return
		}

		// Extract Bearer token
		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			abortWithError(c, http.StatusUnauthorized, entity.ErrInvalidToken)
			return
		}
		tokenString := parts[1]

		// Parse and validate token
		claims, err := validateToken(tokenString, jwks, authCfg)
		if err != nil {
			slog.WarnContext(c.Request.Context(), "token validation failed",
				slog.String("error", err.Error()),
				slog.String("operation_id", GetOperationID(c)),
			)
			abortWithError(c, http.StatusUnauthorized, err)
			return
		}

		// Store user info in context
		c.Set(userIDKey, claims.Subject)
		if claims.Email != "" {
			c.Set(userEmailKey, claims.Email)
		}
		if claims.Name != "" {
			c.Set(userNameKey, claims.Name)
		}

		c.Next()
	}
}

// KeycloakClaims represents the JWT claims from Keycloak.
type KeycloakClaims struct {
	jwt.RegisteredClaims
	Email         string `json:"email,omitempty"`
	EmailVerified bool   `json:"email_verified,omitempty"`
	Name          string `json:"name,omitempty"`
	PreferredUser string `json:"preferred_username,omitempty"`
}

// validateToken validates the JWT token and returns the claims.
func validateToken(tokenString string, jwks keyfunc.Keyfunc, authCfg *config.AuthConfig) (*KeycloakClaims, error) {
	var claims KeycloakClaims

	// If JWKS is not configured, parse without validation (development mode)
	if jwks == nil {
		_, _, err := jwt.NewParser().ParseUnverified(tokenString, &claims)
		if err != nil {
			return nil, fmt.Errorf("%w: %v", entity.ErrInvalidToken, err)
		}
		// Note: ParseUnverified doesn't set token.Valid since no signature verification occurs.
		// In dev mode, we trust the token structure is valid if parsing succeeded.
		return &claims, nil
	}

	// Parse and validate with JWKS
	token, err := jwt.ParseWithClaims(tokenString, &claims, jwks.Keyfunc,
		jwt.WithValidMethods([]string{"RS256", "RS384", "RS512"}),
		jwt.WithExpirationRequired(),
	)
	if err != nil {
		if strings.Contains(err.Error(), "expired") {
			return nil, entity.ErrTokenExpired
		}
		return nil, fmt.Errorf("%w: %v", entity.ErrInvalidToken, err)
	}

	if !token.Valid {
		return nil, entity.ErrInvalidToken
	}

	// Validate issuer if configured
	if authCfg.Issuer != "" {
		issuer, err := claims.GetIssuer()
		if err != nil || issuer != authCfg.Issuer {
			return nil, entity.ErrInvalidToken
		}
	}

	// Validate audience if configured
	if authCfg.Audience != "" {
		audience, err := claims.GetAudience()
		if err != nil {
			return nil, entity.ErrInvalidToken
		}
		found := false
		for _, aud := range audience {
			if aud == authCfg.Audience {
				found = true
				break
			}
		}
		if !found {
			return nil, entity.ErrInvalidToken
		}
	}

	return &claims, nil
}

// GetUserID retrieves the authenticated user ID from the Gin context.
func GetUserID(c *gin.Context) (string, bool) {
	if val, exists := c.Get(userIDKey); exists {
		if userID, ok := val.(string); ok && userID != "" {
			return userID, true
		}
	}
	return "", false
}

// GetUserEmail retrieves the authenticated user email from the Gin context.
func GetUserEmail(c *gin.Context) (string, bool) {
	if val, exists := c.Get(userEmailKey); exists {
		if email, ok := val.(string); ok && email != "" {
			return email, true
		}
	}
	return "", false
}

// GetUserName retrieves the authenticated user name from the Gin context.
func GetUserName(c *gin.Context) (string, bool) {
	if val, exists := c.Get(userNameKey); exists {
		if name, ok := val.(string); ok && name != "" {
			return name, true
		}
	}
	return "", false
}

// abortWithError aborts the request with a JSON error response.
func abortWithError(c *gin.Context, status int, err error) {
	c.AbortWithStatusJSON(status, gin.H{
		"error": err.Error(),
	})
}
