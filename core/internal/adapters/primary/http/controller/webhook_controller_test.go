//go:build integration

package controller_test

import (
	"encoding/json"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/rendis/doc-assembly/core/internal/core/entity"
	"github.com/rendis/doc-assembly/core/internal/core/port"
	"github.com/rendis/doc-assembly/core/internal/testing/testhelper"
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

	t.Run("recipient signed updates to IN_PROGRESS", func(t *testing.T) {
		doc := env.createDocument(t, "Webhook Signed Doc")

		// Find the first recipient's provider ID
		recipientProviderID := doc.Recipients[0].SignerRecipientID

		// Simulate the sign in the mock adapter
		env.ts.MockSigningAdapter.SimulateSign(*recipientProviderID)

		// Send webhook event for recipient signed
		recipientStatus := entity.RecipientStatusSigned
		webhookEvent := port.WebhookEvent{
			EventType:           "DOCUMENT_RECIPIENT_SIGNED",
			ProviderDocumentID:  *doc.SignerDocumentID,
			ProviderRecipientID: *recipientProviderID,
			RecipientStatus:     &recipientStatus,
			Timestamp:           time.Now(),
		}

		resp, body := env.client.POST("/webhooks/signing/mock", webhookEvent)
		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var result map[string]string
		require.NoError(t, json.Unmarshal(body, &result))
		assert.Equal(t, "ok", result["status"])

		// Verify document is still pending/in-progress (not all signed yet)
		getResp, getBody := env.viewerClient().GET("/api/v1/documents/" + doc.ID)
		require.Equal(t, http.StatusOK, getResp.StatusCode)

		var updated entity.DocumentWithRecipients
		require.NoError(t, json.Unmarshal(getBody, &updated))
		// With only 1 of 2 recipients signed, document should not be COMPLETED
		assert.NotEqual(t, entity.DocumentStatusCompleted, updated.Status)
	})

	t.Run("all recipients signed leads to COMPLETED", func(t *testing.T) {
		doc := env.createDocument(t, "Webhook Complete Doc")

		// Sign all recipients via mock adapter
		for _, r := range doc.Recipients {
			env.ts.MockSigningAdapter.SimulateSign(*r.SignerRecipientID)
		}

		// Send webhook for each recipient
		for _, r := range doc.Recipients {
			recipientStatus := entity.RecipientStatusSigned
			webhookEvent := port.WebhookEvent{
				EventType:           "DOCUMENT_RECIPIENT_SIGNED",
				ProviderDocumentID:  *doc.SignerDocumentID,
				ProviderRecipientID: *r.SignerRecipientID,
				RecipientStatus:     &recipientStatus,
				Timestamp:           time.Now(),
			}

			resp, _ := env.client.POST("/webhooks/signing/mock", webhookEvent)
			require.Equal(t, http.StatusOK, resp.StatusCode)
		}

		// Verify document is COMPLETED
		getResp, getBody := env.viewerClient().GET("/api/v1/documents/" + doc.ID)
		require.Equal(t, http.StatusOK, getResp.StatusCode)

		var completed entity.DocumentWithRecipients
		require.NoError(t, json.Unmarshal(getBody, &completed))
		assert.Equal(t, entity.DocumentStatusCompleted, completed.Status)
	})

	t.Run("document status update via webhook", func(t *testing.T) {
		doc := env.createDocument(t, "Webhook Status Doc")

		// Simulate complete in provider
		env.ts.MockSigningAdapter.SimulateComplete(*doc.SignerDocumentID)

		// Send webhook with document-level status
		completedStatus := entity.DocumentStatusCompleted
		webhookEvent := port.WebhookEvent{
			EventType:          "DOCUMENT_COMPLETED",
			ProviderDocumentID: *doc.SignerDocumentID,
			DocumentStatus:     &completedStatus,
			Timestamp:          time.Now(),
		}

		resp, body := env.client.POST("/webhooks/signing/mock", webhookEvent)
		assert.Equal(t, http.StatusOK, resp.StatusCode)

		var result map[string]string
		require.NoError(t, json.Unmarshal(body, &result))
		assert.Equal(t, "ok", result["status"])

		// Verify document is COMPLETED
		getResp, getBody := env.viewerClient().GET("/api/v1/documents/" + doc.ID)
		require.Equal(t, http.StatusOK, getResp.StatusCode)

		var completed entity.DocumentWithRecipients
		require.NoError(t, json.Unmarshal(getBody, &completed))
		assert.Equal(t, entity.DocumentStatusCompleted, completed.Status)
	})

	t.Run("full happy path: create > sign > webhook > verify", func(t *testing.T) {
		// 1. Create document
		doc := env.createDocument(t, "Happy Path Doc")
		assert.Equal(t, entity.DocumentStatusPending, doc.Status)
		assert.Len(t, doc.Recipients, 2)

		// 2. Simulate first recipient signing
		env.ts.MockSigningAdapter.SimulateSign(*doc.Recipients[0].SignerRecipientID)
		recipientStatus := entity.RecipientStatusSigned
		webhook1 := port.WebhookEvent{
			EventType:           "DOCUMENT_RECIPIENT_SIGNED",
			ProviderDocumentID:  *doc.SignerDocumentID,
			ProviderRecipientID: *doc.Recipients[0].SignerRecipientID,
			RecipientStatus:     &recipientStatus,
			Timestamp:           time.Now(),
		}
		resp1, _ := env.client.POST("/webhooks/signing/mock", webhook1)
		require.Equal(t, http.StatusOK, resp1.StatusCode)

		// 3. Simulate second recipient signing
		env.ts.MockSigningAdapter.SimulateSign(*doc.Recipients[1].SignerRecipientID)
		webhook2 := port.WebhookEvent{
			EventType:           "DOCUMENT_RECIPIENT_SIGNED",
			ProviderDocumentID:  *doc.SignerDocumentID,
			ProviderRecipientID: *doc.Recipients[1].SignerRecipientID,
			RecipientStatus:     &recipientStatus,
			Timestamp:           time.Now(),
		}
		resp2, _ := env.client.POST("/webhooks/signing/mock", webhook2)
		require.Equal(t, http.StatusOK, resp2.StatusCode)

		// Also mark the document as COMPLETED in mock adapter so PDF download works
		env.ts.MockSigningAdapter.SimulateComplete(*doc.SignerDocumentID)

		// 4. Verify document is COMPLETED
		getResp, getBody := env.viewerClient().GET("/api/v1/documents/" + doc.ID)
		require.Equal(t, http.StatusOK, getResp.StatusCode)

		var final entity.DocumentWithRecipients
		require.NoError(t, json.Unmarshal(getBody, &final))
		assert.Equal(t, entity.DocumentStatusCompleted, final.Status)

		// 5. Download the signed PDF
		pdfResp, pdfBody := env.viewerClient().GET("/api/v1/documents/" + doc.ID + "/pdf")
		assert.Equal(t, http.StatusOK, pdfResp.StatusCode)
		assert.NotEmpty(t, pdfBody)
	})
}
