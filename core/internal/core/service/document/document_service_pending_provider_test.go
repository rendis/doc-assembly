package document

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"github.com/stretchr/testify/require"

	"github.com/rendis/doc-assembly/core/internal/core/entity"
	"github.com/rendis/doc-assembly/core/internal/core/entity/portabledoc"
	"github.com/rendis/doc-assembly/core/internal/core/port"
)

func TestProcessPendingProviderDocuments_SendsSignatureFieldsWhenRetryingStoredPDF(t *testing.T) {
	ctx := context.Background()

	const (
		documentID        = "doc-1"
		workspaceID       = "workspace-1"
		templateVersionID = "version-1"
		dbRoleID          = "role-guardian"
		portableRoleID    = "portable-guardian"
		storagePath       = "documents/workspace-1/doc-1/pre-signed.pdf"
	)

	doc := entity.NewDocument(workspaceID, templateVersionID)
	doc.ID = documentID
	doc.DocumentTypeID = "contract"
	require.NoError(t, doc.MarkAsPendingProvider())
	doc.SetPDFPath(storagePath)

	recipient := entity.NewDocumentRecipient(documentID, dbRoleID, "Guardian", "guardian@example.com")
	recipient.ID = "recipient-1"

	version := entity.NewTemplateVersion("template-1", 1, "Contract", nil)
	version.ID = templateVersionID
	version.ContentStructure = json.RawMessage(`{
		"version": "1.2.0",
		"signerRoles": [
			{
				"id": "portable-guardian",
				"label": "Guardian",
				"name": { "type": "text", "value": "Guardian" },
				"email": { "type": "text", "value": "guardian@example.com" },
				"order": 1
			}
		],
		"content": { "type": "doc", "content": [] }
	}`)

	signingProvider := &capturingSigningProvider{failWhenSignatureFieldsMissing: true}

	svc := &DocumentService{
		documentRepo: &pendingProviderDocumentRepo{
			pending: []*entity.Document{doc},
		},
		recipientRepo: &pendingProviderRecipientRepo{
			recipients: []*entity.DocumentRecipient{recipient},
		},
		versionRepo: &pendingProviderVersionRepo{
			version: version,
		},
		signerRoleRepo: &pendingProviderSignerRoleRepo{
			roles: []*entity.TemplateVersionSignerRole{
				{
					ID:                dbRoleID,
					TemplateVersionID: templateVersionID,
					RoleName:          "Guardian",
					AnchorString:      portabledoc.GenerateAnchorString("Guardian"),
					SignerOrder:       1,
				},
			},
		},
		fieldResponseRepo: &pendingProviderFieldResponseRepo{},
		pdfRenderer: &pendingProviderPDFRenderer{
			result: &port.RenderPreviewResult{
				PDF: []byte("%PDF rendered"),
				SignatureFields: []port.SignatureField{
					{
						RoleID:       portableRoleID,
						AnchorString: portabledoc.GenerateAnchorString("Guardian"),
						Page:         1,
						PositionX:    10,
						PositionY:    20,
						Width:        30,
						Height:       5,
					},
				},
			},
		},
		signingProvider: signingProvider,
		storageAdapter: &pendingProviderStorageAdapter{
			data: []byte("%PDF stored"),
		},
		storageEnabled: true,
	}

	err := svc.ProcessPendingProviderDocuments(ctx, 1)
	require.NoError(t, err)
	require.NotNil(t, signingProvider.lastUpload)
	require.Equal(t, []byte("%PDF stored"), signingProvider.lastUpload.PDF)
	require.NotEmpty(t, signingProvider.lastUpload.SignatureFields, "PENDING_PROVIDER retry must recreate signature fields before uploading to Documenso")
	require.Equal(t, dbRoleID, signingProvider.lastUpload.SignatureFields[0].RoleID)
	require.Equal(t, entity.DocumentStatusPending, doc.Status)
}

type pendingProviderDocumentRepo struct {
	port.DocumentRepository
	pending []*entity.Document
}

func (r *pendingProviderDocumentRepo) FindPendingProviderForUpload(context.Context, int) ([]*entity.Document, error) {
	return r.pending, nil
}

func (r *pendingProviderDocumentRepo) Update(context.Context, *entity.Document) error {
	return nil
}

type pendingProviderRecipientRepo struct {
	port.DocumentRecipientRepository
	recipients []*entity.DocumentRecipient
}

func (r *pendingProviderRecipientRepo) FindByDocumentID(context.Context, string) ([]*entity.DocumentRecipient, error) {
	return r.recipients, nil
}

func (r *pendingProviderRecipientRepo) Update(context.Context, *entity.DocumentRecipient) error {
	return nil
}

type pendingProviderVersionRepo struct {
	port.TemplateVersionRepository
	version *entity.TemplateVersion
}

func (r *pendingProviderVersionRepo) FindByID(context.Context, string) (*entity.TemplateVersion, error) {
	return r.version, nil
}

type pendingProviderSignerRoleRepo struct {
	port.TemplateVersionSignerRoleRepository
	roles []*entity.TemplateVersionSignerRole
}

func (r *pendingProviderSignerRoleRepo) FindByVersionID(context.Context, string) ([]*entity.TemplateVersionSignerRole, error) {
	return r.roles, nil
}

type pendingProviderFieldResponseRepo struct {
	port.DocumentFieldResponseRepository
}

func (r *pendingProviderFieldResponseRepo) FindByDocumentID(context.Context, string) ([]entity.DocumentFieldResponse, error) {
	return nil, nil
}

type pendingProviderPDFRenderer struct {
	port.PDFRenderer
	result *port.RenderPreviewResult
}

func (r *pendingProviderPDFRenderer) RenderPreview(context.Context, *port.RenderPreviewRequest) (*port.RenderPreviewResult, error) {
	return r.result, nil
}

type pendingProviderStorageAdapter struct {
	port.StorageAdapter
	data            []byte
	lastDownloadKey string
}

func (a *pendingProviderStorageAdapter) Download(_ context.Context, req *port.StorageRequest) ([]byte, error) {
	a.lastDownloadKey = req.Key
	return a.data, nil
}

type capturingSigningProvider struct {
	port.SigningProvider
	lastUpload                     *port.UploadDocumentRequest
	failWhenSignatureFieldsMissing bool
}

func (p *capturingSigningProvider) UploadDocument(_ context.Context, req *port.UploadDocumentRequest) (*port.UploadDocumentResult, error) {
	p.lastUpload = req
	if p.failWhenSignatureFieldsMissing && len(req.SignatureFields) == 0 {
		return nil, errors.New("documenso API error distributing envelope (status 400): Signers must have at least one signature field")
	}

	return &port.UploadDocumentResult{
		ProviderDocumentID: "provider-doc-1",
		ProviderName:       "documenso",
		Status:             entity.DocumentStatusPending,
		Recipients: []port.RecipientResult{
			{
				RoleID:              "role-guardian",
				ProviderRecipientID: "provider-recipient-1",
				SigningURL:          "https://sign.example.test/sign/provider-recipient-1",
				Status:              entity.RecipientStatusSent,
			},
		},
	}, nil
}
