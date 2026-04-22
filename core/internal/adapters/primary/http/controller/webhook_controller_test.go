//go:build integration

package controller_test

import (
	"encoding/json"
	"net/http"
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestWebhookController_HandleSigningWebhook(t *testing.T) {
	env := setupDocumentEnv(t)

	t.Run("unknown provider returns 400", func(t *testing.T) {
		payload := map[string]string{"event": "test"}
		resp, body := env.client.POST("/webhooks/signing/nonexistent", payload)

		assert.Equal(t, http.StatusBadRequest, resp.StatusCode)

		var result map[string]string
		require.NoError(t, json.Unmarshal(body, &result))
		assert.Equal(t, "unknown provider", result["error"])
	})
}
