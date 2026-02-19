package documentaccesstokenrepo

const (
	queryCreate = `
		INSERT INTO execution.document_access_tokens (
			document_id, recipient_id, token, expires_at, created_at
		) VALUES ($1, $2, $3, $4, $5)
	`

	queryFindByAccessValue = ` -- nolint:gosec // not a credential, SQL query param
		SELECT id, document_id, recipient_id, token, expires_at, used_at, created_at
		FROM execution.document_access_tokens
		WHERE token = $1
	`

	queryMarkAsUsed = `
		UPDATE execution.document_access_tokens
		SET used_at = NOW()
		WHERE id = $1
	`

	queryInvalidateByDocumentID = `
		UPDATE execution.document_access_tokens
		SET used_at = NOW()
		WHERE document_id = $1
		  AND used_at IS NULL
	`
)
