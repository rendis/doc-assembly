//go:build integration

package testhelper

import (
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// testSigningKey is used for signing test tokens.
// Since JWKS_URL is empty in tests, the JWTAuth middleware uses ParseUnverified
// which doesn't validate the signature, but we still need a valid JWT structure.
var testSigningKey = []byte("test-secret-key-for-integration-tests")

// TestClaims represents JWT claims for test tokens.
// Matches the KeycloakClaims structure expected by the JWTAuth middleware.
type TestClaims struct {
	jwt.RegisteredClaims
	Email         string `json:"email,omitempty"`
	EmailVerified bool   `json:"email_verified,omitempty"`
	Name          string `json:"name,omitempty"`
	PreferredUser string `json:"preferred_username,omitempty"`
}

// GenerateTestToken creates a signed JWT token for testing.
// The token is signed with HS256, but in test mode (empty JWKS_URL),
// the middleware uses ParseUnverified which doesn't validate the signature.
func GenerateTestToken(email, name string) string {
	claims := TestClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   email,
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(1 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			NotBefore: jwt.NewNumericDate(time.Now()),
		},
		Email:         email,
		EmailVerified: true,
		Name:          name,
		PreferredUser: email,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(testSigningKey)
	if err != nil {
		panic("failed to sign test token: " + err.Error())
	}

	return tokenString
}

// GenerateExpiredToken creates an expired JWT token for testing unauthorized scenarios.
func GenerateExpiredToken(email, name string) string {
	claims := TestClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   email,
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(-1 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
			NotBefore: jwt.NewNumericDate(time.Now().Add(-2 * time.Hour)),
		},
		Email:         email,
		EmailVerified: true,
		Name:          name,
		PreferredUser: email,
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString(testSigningKey)
	if err != nil {
		panic("failed to sign test token: " + err.Error())
	}

	return tokenString
}
