//go:build integration

package controller_test

import (
	"context"
	"encoding/json"
	"net/http"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/rendis/doc-assembly/core/internal/core/entity"
	"github.com/rendis/doc-assembly/core/internal/core/port"
)

type publicSigningState struct {
	Step        string `json:"step"`
	CanDownload bool   `json:"canDownload"`
}

func TestPublicSigningController_CompletedFlowSupportsDownload(t *testing.T) {
	env := setupDocumentEnv(t)
	setTemplateVersionContent(t, env, `{}`)

	doc := env.createDocument(t, "Public Signed Download")

	resp, _ := env.client.POST("/public/doc/"+doc.ID+"/request-access", map[string]string{
		"email": "alice@test.com",
	})
	require.Equal(t, http.StatusOK, resp.StatusCode)

	token := findLatestAccessToken(t, env, doc.ID, "alice@test.com")
	require.NotEmpty(t, token)

	resp, body := env.client.GET("/public/sign/" + token)
	require.Equal(t, http.StatusOK, resp.StatusCode)
	var page publicSigningState
	require.NoError(t, json.Unmarshal(body, &page))
	assert.Equal(t, "preview", page.Step)

	resp, body = env.client.POST("/public/sign/"+token+"/proceed", nil)
	require.Equal(t, http.StatusOK, resp.StatusCode, string(body))

	docResp, docBody := env.viewerClient().GET("/api/v1/documents/" + doc.ID)
	require.Equal(t, http.StatusOK, docResp.StatusCode)

	var withProvider entity.DocumentWithRecipients
	require.NoError(t, json.Unmarshal(docBody, &withProvider))
	require.NotNil(t, withProvider.SignerDocumentID)

	env.ts.MockSigningAdapter.SimulateComplete(*withProvider.SignerDocumentID)

	recipientSigned := entity.RecipientStatusSigned
	for _, r := range withProvider.Recipients {
		require.NotNil(t, r.SignerRecipientID)
		env.ts.MockSigningAdapter.SimulateSign(*r.SignerRecipientID)

		event := port.WebhookEvent{
			EventType:           "DOCUMENT_RECIPIENT_SIGNED",
			ProviderDocumentID:  *withProvider.SignerDocumentID,
			ProviderRecipientID: *r.SignerRecipientID,
			RecipientStatus:     &recipientSigned,
			Timestamp:           time.Now(),
		}
		resp, webhookBody := env.client.POST("/webhooks/signing/mock", event)
		require.Equal(t, http.StatusOK, resp.StatusCode, string(webhookBody))
	}

	resp, body = env.client.GET("/public/sign/" + token)
	require.Equal(t, http.StatusOK, resp.StatusCode, string(body))
	require.NoError(t, json.Unmarshal(body, &page))
	assert.Equal(t, "completed", page.Step)
	assert.True(t, page.CanDownload)

	resp, pdfBody := env.client.GET("/public/sign/" + token + "/download")
	assert.Equal(t, http.StatusOK, resp.StatusCode, string(pdfBody))
	assert.NotEmpty(t, pdfBody)
	assert.Contains(t, resp.Header.Get("Content-Type"), "application/pdf")
}

func TestPublicSigningController_RequestAccessFromExpiredToken(t *testing.T) {
	env := setupDocumentEnv(t)
	setTemplateVersionContent(t, env, `{}`)

	doc := env.createDocument(t, "Public Expired Access")

	resp, _ := env.client.POST("/public/doc/"+doc.ID+"/request-access", map[string]string{
		"email": "alice@test.com",
	})
	require.Equal(t, http.StatusOK, resp.StatusCode)

	token := findLatestAccessToken(t, env, doc.ID, "alice@test.com")
	require.NotEmpty(t, token)

	_, err := env.ts.Pool.Exec(context.Background(),
		`UPDATE execution.document_access_tokens SET expires_at = NOW() - INTERVAL '1 hour' WHERE token = $1`,
		token,
	)
	require.NoError(t, err)

	resp, _ = env.client.GET("/public/sign/" + token)
	require.Equal(t, http.StatusUnauthorized, resp.StatusCode)

	resp, body := env.client.POST("/public/sign/"+token+"/request-access", map[string]string{
		"email": "alice@test.com",
	})
	require.Equal(t, http.StatusOK, resp.StatusCode, string(body))

	var tokenCount int
	err = env.ts.Pool.QueryRow(context.Background(), `
		SELECT COUNT(*)
		FROM execution.document_access_tokens t
		JOIN execution.document_recipients r ON r.id = t.recipient_id
		WHERE t.document_id = $1 AND LOWER(r.email) = LOWER($2)
	`, doc.ID, "alice@test.com").Scan(&tokenCount)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, tokenCount, 2)
}

func findLatestAccessToken(t *testing.T, env *documentTestEnv, documentID, email string) string {
	t.Helper()

	var token string
	err := env.ts.Pool.QueryRow(context.Background(), `
		SELECT t.token
		FROM execution.document_access_tokens t
		JOIN execution.document_recipients r ON r.id = t.recipient_id
		WHERE t.document_id = $1
		  AND LOWER(r.email) = LOWER($2)
		ORDER BY t.created_at DESC
		LIMIT 1
	`, documentID, email).Scan(&token)
	require.NoError(t, err)
	return token
}

func setTemplateVersionContent(t *testing.T, env *documentTestEnv, content string) {
	t.Helper()

	_, err := env.ts.Pool.Exec(
		context.Background(),
		`UPDATE content.template_versions SET content_structure = $1 WHERE id = $2`,
		[]byte(content),
		env.versionID,
	)
	require.NoError(t, err)
}
