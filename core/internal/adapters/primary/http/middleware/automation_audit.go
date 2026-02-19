package middleware

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rendis/doc-assembly/core/internal/core/entity"
	"github.com/rendis/doc-assembly/core/internal/core/port"
)

const (
	bodyCaptureLimitBytes = 64 * 1024 // 64 KB
	auditWriteTimeout     = 3 * time.Second
)

// AutomationAuditLogger is a Gin middleware that asynchronously records all automation API
// calls to the audit log table. It must run AFTER AutomationKeyAuth so that the key ID
// is available in the context.
func AutomationAuditLogger(auditRepo port.AutomationAuditLogRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Capture request body (limited to bodyCaptureLimitBytes)
		var requestBody json.RawMessage
		if c.Request.Body != nil {
			limited := io.LimitReader(c.Request.Body, bodyCaptureLimitBytes)
			raw, _ := io.ReadAll(limited)
			c.Request.Body = io.NopCloser(bytes.NewBuffer(raw))
			if len(raw) > 0 {
				requestBody = raw
			}
		}

		// Wrap ResponseWriter to capture status code
		rw := &responseStatusWriter{ResponseWriter: c.Writer, status: http.StatusOK}
		c.Writer = rw

		c.Next()

		// Read context values after handler ran
		keyID, _ := GetAutomationKeyID(c)
		keyPrefix, _ := GetAutomationKeyPrefix(c)
		if keyID == "" {
			return // no key in context, nothing to audit
		}

		// Extract optional tenant/workspace from path params
		tenantID := extractOptionalParam(c, "tenantId")
		workspaceID := extractOptionalParam(c, "workspaceId")

		// Infer resource type and action from method + path
		resourceType, resourceID, action := inferResourceAction(c.Request.Method, c.FullPath(), c.Params)

		logEntry := &entity.AutomationAuditLog{
			APIKeyID:       keyID,
			APIKeyPrefix:   keyPrefix,
			Method:         c.Request.Method,
			Path:           c.Request.URL.Path,
			TenantID:       tenantID,
			WorkspaceID:    workspaceID,
			ResourceType:   resourceType,
			ResourceID:     resourceID,
			Action:         action,
			RequestBody:    requestBody,
			ResponseStatus: rw.status,
		}

		// Write asynchronously — do not block the response
		go func() {
			ctx, cancel := context.WithTimeout(context.Background(), auditWriteTimeout)
			defer cancel()
			_ = auditRepo.Create(ctx, logEntry)
		}()
	}
}

// responseStatusWriter wraps gin.ResponseWriter to capture the HTTP status code.
type responseStatusWriter struct {
	gin.ResponseWriter
	status int
}

func (w *responseStatusWriter) WriteHeader(code int) {
	w.status = code
	w.ResponseWriter.WriteHeader(code)
}

func (w *responseStatusWriter) WriteHeaderNow() {
	w.ResponseWriter.WriteHeaderNow()
	w.status = w.ResponseWriter.Status()
}

// extractOptionalParam returns a pointer to the path param value, or nil if not present.
func extractOptionalParam(c *gin.Context, paramName string) *string {
	v := c.Param(paramName)
	if v == "" {
		return nil
	}
	return &v
}

// inferResourceAction infers resource type, resource ID, and action from the HTTP method and path.
func inferResourceAction(method, path string, params gin.Params) (resourceType, resourceID *string, action *string) {
	// Determine action from method
	var act string
	switch method {
	case http.MethodPost:
		act = "CREATE"
	case http.MethodPut, http.MethodPatch:
		act = "UPDATE"
	case http.MethodDelete:
		act = "DELETE"
	case http.MethodGet:
		act = "READ"
	default:
		act = method
	}

	// Override action for publish/archive suffixes
	lower := strings.ToLower(path)
	switch {
	case strings.HasSuffix(lower, "/publish"):
		act = "PUBLISH"
	case strings.HasSuffix(lower, "/archive"):
		act = "ARCHIVE"
	case strings.HasSuffix(lower, "/content") && method == http.MethodPut:
		act = "UPDATE_CONTENT"
	}

	// Determine resource type from path segments
	var rt string
	switch {
	case strings.Contains(lower, "/versions"):
		rt = "VERSION"
	case strings.Contains(lower, "/templates"):
		rt = "TEMPLATE"
	case strings.Contains(lower, "/workspaces"):
		rt = "WORKSPACE"
	case strings.Contains(lower, "/tenants"):
		rt = "TENANT"
	case strings.Contains(lower, "/injectables"):
		rt = "INJECTABLE"
	case strings.Contains(lower, "/document-types"):
		rt = "DOCUMENT_TYPE"
	}

	if rt != "" {
		resourceType = &rt
	}
	action = &act

	// Determine resource ID: prefer versionId > templateId > workspaceId > tenantId
	for _, paramName := range []string{"versionId", "templateId", "workspaceId", "tenantId"} {
		for _, p := range params {
			if p.Key == paramName && p.Value != "" {
				v := p.Value
				resourceID = &v
				return
			}
		}
	}

	return
}
