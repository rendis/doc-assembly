package documenteventrepo

const (
	queryCreate = `
		INSERT INTO execution.document_events (
			document_id, event_type, actor_type, actor_id,
			old_status, new_status, recipient_id, metadata, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`

	queryFindByDocumentID = `
		SELECT id, document_id, event_type, actor_type, actor_id,
			   old_status, new_status, recipient_id, metadata, created_at
		FROM execution.document_events
		WHERE document_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`
)
