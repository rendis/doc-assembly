package documentrecipientrepo

const (
	queryCreate = `
		INSERT INTO execution.document_recipients (
			document_id, template_version_role_id, name, email,
			signer_recipient_id, signing_url, status, signed_at, created_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id
	`

	queryFindByID = `
		SELECT id, document_id, template_version_role_id, name, email,
			   signer_recipient_id, signing_url, status, signed_at, created_at, updated_at
		FROM execution.document_recipients
		WHERE id = $1
	`

	queryFindByDocumentID = `
		SELECT id, document_id, template_version_role_id, name, email,
			   signer_recipient_id, signing_url, status, signed_at, created_at, updated_at
		FROM execution.document_recipients
		WHERE document_id = $1
		ORDER BY created_at ASC
	`

	queryFindByDocumentIDWithRoles = `
		SELECT dr.id, dr.document_id, dr.template_version_role_id, dr.name, dr.email,
			   dr.signer_recipient_id, dr.signing_url, dr.status, dr.signed_at, dr.created_at, dr.updated_at,
			   tvsr.role_name, tvsr.signer_order
		FROM execution.document_recipients dr
		JOIN content.template_version_signer_roles tvsr ON dr.template_version_role_id = tvsr.id
		WHERE dr.document_id = $1
		ORDER BY tvsr.signer_order ASC
	`

	queryFindBySignerRecipientID = `
		SELECT id, document_id, template_version_role_id, name, email,
			   signer_recipient_id, signing_url, status, signed_at, created_at, updated_at
		FROM execution.document_recipients
		WHERE signer_recipient_id = $1
	`

	queryFindByDocumentAndRole = `
		SELECT id, document_id, template_version_role_id, name, email,
			   signer_recipient_id, signing_url, status, signed_at, created_at, updated_at
		FROM execution.document_recipients
		WHERE document_id = $1 AND template_version_role_id = $2
	`

	queryUpdate = `
		UPDATE execution.document_recipients
		SET name = $2, email = $3, signer_recipient_id = $4, signing_url = $5, status = $6,
			signed_at = $7, updated_at = $8
		WHERE id = $1
	`

	queryUpdateStatus = `
		UPDATE execution.document_recipients
		SET status = $2, updated_at = NOW()
		WHERE id = $1
	`

	queryUpdateSignerInfo = `
		UPDATE execution.document_recipients
		SET signer_recipient_id = $2, updated_at = NOW()
		WHERE id = $1
	`

	queryDelete = `
		DELETE FROM execution.document_recipients
		WHERE id = $1
	`

	queryDeleteByDocumentID = `
		DELETE FROM execution.document_recipients
		WHERE document_id = $1
	`

	queryCountByDocumentAndStatus = `
		SELECT COUNT(*)
		FROM execution.document_recipients
		WHERE document_id = $1 AND status = $2
	`

	queryCountByDocument = `
		SELECT COUNT(*)
		FROM execution.document_recipients
		WHERE document_id = $1
	`

	queryAllSigned = `
		SELECT NOT EXISTS (
			SELECT 1 FROM execution.document_recipients
			WHERE document_id = $1 AND status != 'SIGNED'
		)
	`

	queryAnyDeclined = `
		SELECT EXISTS (
			SELECT 1 FROM execution.document_recipients
			WHERE document_id = $1 AND status = 'DECLINED'
		)
	`
)
