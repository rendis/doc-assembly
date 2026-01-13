package documentrepo

const (
	queryCreate = `
		INSERT INTO execution.documents (
			workspace_id, template_version_id, title, client_external_reference_id,
			transactional_id, operation_type, related_document_id,
			signer_document_id, signer_provider, status, injected_values_snapshot,
			pdf_storage_path, completed_pdf_url, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
		RETURNING id
	`

	queryFindByID = `
		SELECT id, workspace_id, template_version_id, title, client_external_reference_id,
			   transactional_id, operation_type, related_document_id,
			   signer_document_id, signer_provider, status, injected_values_snapshot,
			   pdf_storage_path, completed_pdf_url, created_at, updated_at
		FROM execution.documents
		WHERE id = $1
	`

	queryFindBySignerDocumentID = `
		SELECT id, workspace_id, template_version_id, title, client_external_reference_id,
			   transactional_id, operation_type, related_document_id,
			   signer_document_id, signer_provider, status, injected_values_snapshot,
			   pdf_storage_path, completed_pdf_url, created_at, updated_at
		FROM execution.documents
		WHERE signer_document_id = $1
	`

	queryFindByClientExternalRef = `
		SELECT id, workspace_id, template_version_id, title, client_external_reference_id,
			   transactional_id, operation_type, related_document_id,
			   signer_document_id, signer_provider, status, injected_values_snapshot,
			   pdf_storage_path, completed_pdf_url, created_at, updated_at
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
			   pdf_storage_path, completed_pdf_url, created_at, updated_at
		FROM execution.documents
		WHERE status IN ('PENDING', 'IN_PROGRESS')
		  AND signer_document_id IS NOT NULL
		ORDER BY updated_at ASC NULLS FIRST, created_at ASC
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
			completed_pdf_url = $12, updated_at = $13
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
