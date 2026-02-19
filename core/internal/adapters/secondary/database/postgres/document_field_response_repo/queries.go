package documentfieldresponserepo

const (
	queryCreate = `
		INSERT INTO execution.document_field_responses (
			document_id, recipient_id, field_id, field_type, response, created_at
		) VALUES ($1, $2, $3, $4, $5, $6)
	`

	queryFindByDocumentID = `
		SELECT id, document_id, recipient_id, field_id, field_type, response, created_at
		FROM execution.document_field_responses
		WHERE document_id = $1
		ORDER BY created_at ASC
	`

	queryDeleteByDocumentID = `
		DELETE FROM execution.document_field_responses
		WHERE document_id = $1
	`
)
