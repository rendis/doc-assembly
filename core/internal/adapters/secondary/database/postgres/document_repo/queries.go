package documentrepo

const (
	queryCreate = `
		INSERT INTO execution.documents (
			workspace_id, template_version_id, title, client_external_reference_id,
			transactional_id, operation_type, related_document_id,
			signer_document_id, signer_provider, status, injected_values_snapshot,
			pdf_storage_path, completed_pdf_url, expires_at, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
		RETURNING id
	`

	queryFindByID = `
		SELECT id, workspace_id, template_version_id, title, client_external_reference_id,
			   transactional_id, operation_type, related_document_id,
			   signer_document_id, signer_provider, status, injected_values_snapshot,
			   pdf_storage_path, completed_pdf_url, expires_at,
			   retry_count, last_retry_at, next_retry_at,
			   created_at, updated_at
		FROM execution.documents
		WHERE id = $1
	`

	queryFindBySignerDocumentID = `
		SELECT id, workspace_id, template_version_id, title, client_external_reference_id,
			   transactional_id, operation_type, related_document_id,
			   signer_document_id, signer_provider, status, injected_values_snapshot,
			   pdf_storage_path, completed_pdf_url, expires_at,
			   retry_count, last_retry_at, next_retry_at,
			   created_at, updated_at
		FROM execution.documents
		WHERE signer_document_id = $1
	`

	queryFindByClientExternalRef = `
		SELECT id, workspace_id, template_version_id, title, client_external_reference_id,
			   transactional_id, operation_type, related_document_id,
			   signer_document_id, signer_provider, status, injected_values_snapshot,
			   pdf_storage_path, completed_pdf_url, expires_at,
			   retry_count, last_retry_at, next_retry_at,
			   created_at, updated_at
		FROM execution.documents
		WHERE workspace_id = $1 AND client_external_reference_id = $2
		ORDER BY created_at DESC
	`

	queryFindByTemplateVersion = `
		SELECT id, workspace_id, template_version_id, title, client_external_reference_id,
			   signer_provider, status, created_at, updated_at
		FROM execution.documents
		WHERE template_version_id = $1
		ORDER BY created_at DESC
	`

	queryFindPendingForPolling = `
		SELECT id, workspace_id, template_version_id, title, client_external_reference_id,
			   transactional_id, operation_type, related_document_id,
			   signer_document_id, signer_provider, status, injected_values_snapshot,
			   pdf_storage_path, completed_pdf_url, expires_at,
			   retry_count, last_retry_at, next_retry_at,
			   created_at, updated_at
		FROM execution.documents
		WHERE status IN ('PENDING', 'IN_PROGRESS')
		  AND signer_document_id IS NOT NULL
		ORDER BY updated_at ASC NULLS FIRST, created_at ASC
		LIMIT $1
	`

	queryFindErrorsForRetry = `
		SELECT id, workspace_id, template_version_id, title, client_external_reference_id,
			   transactional_id, operation_type, related_document_id,
			   signer_document_id, signer_provider, status, injected_values_snapshot,
			   pdf_storage_path, completed_pdf_url, expires_at,
			   retry_count, last_retry_at, next_retry_at,
			   created_at, updated_at
		FROM execution.documents
		WHERE status = 'ERROR'
		  AND (next_retry_at IS NULL OR next_retry_at <= NOW())
		  AND retry_count < $1
		ORDER BY next_retry_at ASC NULLS FIRST, created_at ASC
		LIMIT $2
	`

	queryFindPendingProviderForUpload = `
		SELECT id, workspace_id, template_version_id, title, client_external_reference_id,
			   transactional_id, operation_type, related_document_id,
			   signer_document_id, signer_provider, status, injected_values_snapshot,
			   pdf_storage_path, completed_pdf_url, expires_at,
			   retry_count, last_retry_at, next_retry_at,
			   created_at, updated_at
		FROM execution.documents
		WHERE status = 'PENDING_PROVIDER'
		ORDER BY created_at ASC
		LIMIT $1
	`

	queryFindExpired = `
		SELECT id, workspace_id, template_version_id, title, client_external_reference_id,
			   transactional_id, operation_type, related_document_id,
			   signer_document_id, signer_provider, status, injected_values_snapshot,
			   pdf_storage_path, completed_pdf_url, expires_at,
			   retry_count, last_retry_at, next_retry_at,
			   created_at, updated_at
		FROM execution.documents
		WHERE status IN ('PENDING', 'IN_PROGRESS')
		  AND expires_at IS NOT NULL
		  AND expires_at <= NOW()
		ORDER BY expires_at ASC
		LIMIT $1
	`

	queryFindByWorkspaceBase = `
		SELECT id, workspace_id, template_version_id, title, client_external_reference_id,
			   signer_provider, status, created_at, updated_at
		FROM execution.documents
		WHERE workspace_id = $1
	`

	queryUpdate = `
		UPDATE execution.documents
		SET title = $2, client_external_reference_id = $3,
			transactional_id = $4, operation_type = $5, related_document_id = $6,
			signer_document_id = $7, signer_provider = $8, status = $9,
			injected_values_snapshot = $10, pdf_storage_path = $11,
			completed_pdf_url = $12, expires_at = $13,
			retry_count = $14, last_retry_at = $15, next_retry_at = $16,
			updated_at = $17
		WHERE id = $1
	`

	queryUpdateStatus = `
		UPDATE execution.documents
		SET status = $2, updated_at = NOW()
		WHERE id = $1
	`

	queryDelete = `
		DELETE FROM execution.documents
		WHERE id = $1
	`

	queryCountByWorkspace = `
		SELECT COUNT(*)
		FROM execution.documents
		WHERE workspace_id = $1
	`

	queryCountByStatus = `
		SELECT COUNT(*)
		FROM execution.documents
		WHERE workspace_id = $1 AND status = $2
	`
)
