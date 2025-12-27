package middleware

import (
	"log/slog"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

const (
	// OperationIDHeader is the header name for the operation ID.
	OperationIDHeader = "X-Operation-ID"
	// operationIDKey is the context key for the operation ID.
	operationIDKey = "operation_id"
)

// Operation creates a middleware that generates a unique operation ID for each request.
// The operation ID is used for request tracing and logging.
func Operation() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Check if operation ID is already provided in header
		operationID := c.GetHeader(OperationIDHeader)
		if operationID == "" {
			operationID = uuid.New().String()
		}

		// Store in context
		c.Set(operationIDKey, operationID)

		// Add to response headers
		c.Header(OperationIDHeader, operationID)

		// Add to logger context
		slog.Info("request started",
			slog.String("operation_id", operationID),
			slog.String("method", c.Request.Method),
			slog.String("path", c.Request.URL.Path),
			slog.String("client_ip", c.ClientIP()),
		)

		c.Next()

		// Log request completion
		slog.Info("request completed",
			slog.String("operation_id", operationID),
			slog.Int("status", c.Writer.Status()),
		)
	}
}

// GetOperationID retrieves the operation ID from the Gin context.
func GetOperationID(c *gin.Context) string {
	if val, exists := c.Get(operationIDKey); exists {
		if opID, ok := val.(string); ok {
			return opID
		}
	}
	return ""
}
