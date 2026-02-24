//go:build integration

package controller_test

import (
	"context"
	"encoding/json"
	"net/http"
	"sync"
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

func TestPublicSigningController_ConcurrentProceedCreatesOneProviderDoc(t *testing.T) {
	env := setupDocumentEnv(t)
	setTemplateVersionContent(t, env, `{}`)

	doc := env.createDocument(t, "Concurrent Proceed Test")

	// Request access for both signers.
	resp, _ := env.client.POST("/public/doc/"+doc.ID+"/request-access", map[string]string{"email": "alice@test.com"})
	require.Equal(t, http.StatusOK, resp.StatusCode)
	tokenA := findLatestAccessToken(t, env, doc.ID, "alice@test.com")

	resp, _ = env.client.POST("/public/doc/"+doc.ID+"/request-access", map[string]string{"email": "bob@test.com"})
	require.Equal(t, http.StatusOK, resp.StatusCode)
	tokenB := findLatestAccessToken(t, env, doc.ID, "bob@test.com")

	// Reset mock adapter to ensure clean document count.
	env.ts.MockSigningAdapter.Reset()

	// Fire concurrent proceed calls.
	const concurrency = 10
	tokens := []string{tokenA, tokenB}

	type result struct {
		status int
		step   string
	}
	results := make([]result, concurrency)

	var wg sync.WaitGroup
	var ready sync.WaitGroup
	ready.Add(concurrency)
	wg.Add(concurrency)

	for i := 0; i < concurrency; i++ {
		go func(idx int) {
			defer wg.Done()
			tok := tokens[idx%len(tokens)]
			ready.Done()
			ready.Wait() // all goroutines start together
			r, body := env.client.POST("/public/sign/"+tok+"/proceed", nil)
			var page publicSigningState
			_ = json.Unmarshal(body, &page)
			results[idx] = result{status: r.StatusCode, step: page.Step}
		}(i)
	}
	wg.Wait()

	// Exactly 1 document should exist in the mock signing provider.
	assert.Equal(t, 1, env.ts.MockSigningAdapter.DocumentCount(),
		"expected exactly 1 provider document")

	// All responses should be 200 OK with step = signing or processing.
	var signingCount, processingCount int
	for _, r := range results {
		require.Equal(t, http.StatusOK, r.status)
		switch r.step {
		case "signing":
			signingCount++
		case "processing":
			processingCount++
		}
	}
	assert.GreaterOrEqual(t, signingCount, 1, "at least one caller should get signing step")
	t.Logf("results: %d signing, %d processing out of %d calls", signingCount, processingCount, concurrency)
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
