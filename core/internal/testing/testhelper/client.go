//go:build integration

package testhelper

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"
	"testing"

	"github.com/stretchr/testify/require"
)

// HTTPClient wraps http.Client with test helpers for making HTTP requests.
type HTTPClient struct {
	t             *testing.T
	client        *http.Client
	baseURL       string
	authHeader    string
	tenantID      string
	workspaceID   string
	automationKey string
}

// NewHTTPClient creates a new test HTTP client.
func NewHTTPClient(t *testing.T, baseURL string) *HTTPClient {
	return &HTTPClient{
		t:       t,
		client:  &http.Client{},
		baseURL: baseURL,
	}
}

// WithAuth returns a new HTTPClient with the specified Authorization header.
func (c *HTTPClient) WithAuth(bearer string) *HTTPClient {
	return &HTTPClient{
		t:             c.t,
		client:        c.client,
		baseURL:       c.baseURL,
		authHeader:    bearer,
		tenantID:      c.tenantID,
		workspaceID:   c.workspaceID,
		automationKey: c.automationKey,
	}
}

// WithTenantID returns a new HTTPClient with the specified X-Tenant-ID header.
func (c *HTTPClient) WithTenantID(tenantID string) *HTTPClient {
	return &HTTPClient{
		t:             c.t,
		client:        c.client,
		baseURL:       c.baseURL,
		authHeader:    c.authHeader,
		tenantID:      tenantID,
		workspaceID:   c.workspaceID,
		automationKey: c.automationKey,
	}
}

// WithWorkspaceID returns a new HTTPClient with the specified X-Workspace-ID header.
func (c *HTTPClient) WithWorkspaceID(workspaceID string) *HTTPClient {
	return &HTTPClient{
		t:             c.t,
		client:        c.client,
		baseURL:       c.baseURL,
		authHeader:    c.authHeader,
		tenantID:      c.tenantID,
		workspaceID:   workspaceID,
		automationKey: c.automationKey,
	}
}

// WithAutomationKey returns a new HTTPClient with the specified X-Automation-Key header.
func (c *HTTPClient) WithAutomationKey(rawKey string) *HTTPClient {
	return &HTTPClient{
		t:             c.t,
		client:        c.client,
		baseURL:       c.baseURL,
		authHeader:    c.authHeader,
		tenantID:      c.tenantID,
		workspaceID:   c.workspaceID,
		automationKey: rawKey,
	}
}

// Do executes an HTTP request and returns the response and body.
func (c *HTTPClient) Do(method, path string, body interface{}) (*http.Response, []byte) {
	c.t.Helper()

	var reqBody io.Reader
	if body != nil {
		jsonBody, err := json.Marshal(body)
		require.NoError(c.t, err, "failed to marshal request body")
		reqBody = bytes.NewReader(jsonBody)
	}

	req, err := http.NewRequest(method, c.baseURL+path, reqBody)
	require.NoError(c.t, err, "failed to create request")

	req.Header.Set("Content-Type", "application/json")
	if c.authHeader != "" {
		req.Header.Set("Authorization", c.authHeader)
	}
	if c.tenantID != "" {
		req.Header.Set("X-Tenant-ID", c.tenantID)
	}
	if c.workspaceID != "" {
		req.Header.Set("X-Workspace-ID", c.workspaceID)
	}
	if c.automationKey != "" {
		req.Header.Set("X-Automation-Key", c.automationKey)
	}

	resp, err := c.client.Do(req)
	require.NoError(c.t, err, "failed to execute request")

	respBody, err := io.ReadAll(resp.Body)
	require.NoError(c.t, err, "failed to read response body")
	resp.Body.Close()

	return resp, respBody
}

// GET performs a GET request.
func (c *HTTPClient) GET(path string) (*http.Response, []byte) {
	return c.Do(http.MethodGet, path, nil)
}

// POST performs a POST request with JSON body.
func (c *HTTPClient) POST(path string, body interface{}) (*http.Response, []byte) {
	return c.Do(http.MethodPost, path, body)
}

// PUT performs a PUT request with JSON body.
func (c *HTTPClient) PUT(path string, body interface{}) (*http.Response, []byte) {
	return c.Do(http.MethodPut, path, body)
}

// PATCH performs a PATCH request with JSON body.
func (c *HTTPClient) PATCH(path string, body interface{}) (*http.Response, []byte) {
	return c.Do(http.MethodPatch, path, body)
}

// DELETE performs a DELETE request.
func (c *HTTPClient) DELETE(path string) (*http.Response, []byte) {
	return c.Do(http.MethodDelete, path, nil)
}

// ParseJSON parses the response body as JSON into the provided target.
func ParseJSON[T any](t *testing.T, body []byte) T {
	t.Helper()
	var result T
	err := json.Unmarshal(body, &result)
	require.NoError(t, err, "failed to parse JSON response: %s", string(body))
	return result
}
