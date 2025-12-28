package useraccesshistoryrepo

// SQL queries for user access history operations.
const (
	queryRecordAccess = `
		INSERT INTO identity.user_access_history (user_id, entity_type, entity_id, accessed_at)
		VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
		ON CONFLICT (user_id, entity_type, entity_id)
		DO UPDATE SET accessed_at = CURRENT_TIMESTAMP
		RETURNING id`

	queryGetRecentAccessIDs = `
		SELECT entity_id
		FROM identity.user_access_history
		WHERE user_id = $1 AND entity_type = $2
		ORDER BY accessed_at DESC
		LIMIT $3`

	queryGetRecentAccesses = `
		SELECT id, user_id, entity_type, entity_id, accessed_at
		FROM identity.user_access_history
		WHERE user_id = $1 AND entity_type = $2
		ORDER BY accessed_at DESC
		LIMIT $3`

	queryDeleteOldAccesses = `
		DELETE FROM identity.user_access_history
		WHERE id IN (
			SELECT id FROM identity.user_access_history
			WHERE user_id = $1 AND entity_type = $2
			ORDER BY accessed_at DESC
			OFFSET $3
		)`

	queryDeleteByEntity = `
		DELETE FROM identity.user_access_history
		WHERE entity_type = $1 AND entity_id = $2`
)
