//go:build integration

package testhelper

import (
	"context"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/stretchr/testify/require"

	"github.com/rendis/doc-assembly/core/internal/adapters/primary/http/controller"
	"github.com/rendis/doc-assembly/core/internal/adapters/primary/http/mapper"
	"github.com/rendis/doc-assembly/core/internal/adapters/primary/http/middleware"
	documentaccesstokenrepo "github.com/rendis/doc-assembly/core/internal/adapters/secondary/database/postgres/document_access_token_repo"
	documenteventrepo "github.com/rendis/doc-assembly/core/internal/adapters/secondary/database/postgres/document_event_repo"
	documentrecipientrepo "github.com/rendis/doc-assembly/core/internal/adapters/secondary/database/postgres/document_recipient_repo"
	documentrepo "github.com/rendis/doc-assembly/core/internal/adapters/secondary/database/postgres/document_repo"
	folderrepo "github.com/rendis/doc-assembly/core/internal/adapters/secondary/database/postgres/folder_repo"
	injectablerepo "github.com/rendis/doc-assembly/core/internal/adapters/secondary/database/postgres/injectable_repo"
	systeminjectablerepo "github.com/rendis/doc-assembly/core/internal/adapters/secondary/database/postgres/system_injectable_repo"
	systemrolerepo "github.com/rendis/doc-assembly/core/internal/adapters/secondary/database/postgres/system_role_repo"
	tagrepo "github.com/rendis/doc-assembly/core/internal/adapters/secondary/database/postgres/tag_repo"
	templaterepo "github.com/rendis/doc-assembly/core/internal/adapters/secondary/database/postgres/template_repo"
	templatetagrepo "github.com/rendis/doc-assembly/core/internal/adapters/secondary/database/postgres/template_tag_repo"
	templateversioninjectablerepo "github.com/rendis/doc-assembly/core/internal/adapters/secondary/database/postgres/template_version_injectable_repo"
	templateversionrepo "github.com/rendis/doc-assembly/core/internal/adapters/secondary/database/postgres/template_version_repo"
	templateversionsignerrolerepo "github.com/rendis/doc-assembly/core/internal/adapters/secondary/database/postgres/template_version_signer_role_repo"
	tenantmemberrepo "github.com/rendis/doc-assembly/core/internal/adapters/secondary/database/postgres/tenant_member_repo"
	tenantrepo "github.com/rendis/doc-assembly/core/internal/adapters/secondary/database/postgres/tenant_repo"
	useraccesshistoryrepo "github.com/rendis/doc-assembly/core/internal/adapters/secondary/database/postgres/user_access_history_repo"
	userrepo "github.com/rendis/doc-assembly/core/internal/adapters/secondary/database/postgres/user_repo"
	workspaceinjectablerepo "github.com/rendis/doc-assembly/core/internal/adapters/secondary/database/postgres/workspace_injectable_repo"
	workspacememberrepo "github.com/rendis/doc-assembly/core/internal/adapters/secondary/database/postgres/workspace_member_repo"
	workspacerepo "github.com/rendis/doc-assembly/core/internal/adapters/secondary/database/postgres/workspace_repo"
	noopnotification "github.com/rendis/doc-assembly/core/internal/adapters/secondary/notification/noop"
	mocksigning "github.com/rendis/doc-assembly/core/internal/adapters/secondary/signing/mock"
	localstorage "github.com/rendis/doc-assembly/core/internal/adapters/secondary/storage/local"
	"github.com/rendis/doc-assembly/core/internal/core/port"
	accesssvc "github.com/rendis/doc-assembly/core/internal/core/service/access"
	catalogsvc "github.com/rendis/doc-assembly/core/internal/core/service/catalog"
	documentsvc "github.com/rendis/doc-assembly/core/internal/core/service/document"
	injectablesvc "github.com/rendis/doc-assembly/core/internal/core/service/injectable"
	organizationsvc "github.com/rendis/doc-assembly/core/internal/core/service/organization"
	templatesvc "github.com/rendis/doc-assembly/core/internal/core/service/template"
	contentvalidator "github.com/rendis/doc-assembly/core/internal/core/service/template/contentvalidator"
	"github.com/rendis/doc-assembly/core/internal/infra/config"
)

// MockPDFRenderer implements port.PDFRenderer for testing.
type MockPDFRenderer struct{}

// RenderPreview returns minimal PDF bytes.
func (m *MockPDFRenderer) RenderPreview(_ context.Context, _ *port.RenderPreviewRequest) (*port.RenderPreviewResult, error) {
	return &port.RenderPreviewResult{
		PDF:      []byte("%PDF-1.4 mock test pdf"),
		Filename: "test.pdf",
	}, nil
}

// Close is a no-op.
func (m *MockPDFRenderer) Close() error { return nil }

// TestServer wraps an httptest.Server with helper methods for E2E testing.
type TestServer struct {
	Server             *httptest.Server
	Engine             *gin.Engine
	Pool               *pgxpool.Pool
	MockSigningAdapter *mocksigning.Adapter
	t                  *testing.T
}

// NewTestServer creates a test HTTP server with all real dependencies.
// It uses the test database pool and configures the server for E2E testing.
func NewTestServer(t *testing.T, pool *pgxpool.Pool) *TestServer {
	t.Helper()
	gin.SetMode(gin.TestMode)

	// Create repositories - Identity & Tenancy
	userRepo := userrepo.New(pool)
	systemRoleRepo := systemrolerepo.New(pool)
	tenantRepo := tenantrepo.New(pool)
	workspaceRepo := workspacerepo.New(pool)
	workspaceMemberRepo := workspacememberrepo.New(pool)
	tenantMemberRepo := tenantmemberrepo.New(pool)
	folderRepo := folderrepo.New(pool)
	tagRepo := tagrepo.New(pool)
	userAccessHistoryRepo := useraccesshistoryrepo.New(pool)

	// Create repositories - Content
	injectableRepo := injectablerepo.New(pool)
	systemInjectableRepo := systeminjectablerepo.New(pool)
	templateRepo := templaterepo.New(pool)
	templateTagRepo := templatetagrepo.New(pool)
	templateVersionRepo := templateversionrepo.New(pool)
	templateVersionInjectableRepo := templateversioninjectablerepo.New(pool)
	templateVersionSignerRoleRepo := templateversionsignerrolerepo.New(pool)
	workspaceInjectableRepo := workspaceinjectablerepo.New(pool)

	// Create services - Identity & Tenancy
	tenantService := organizationsvc.NewTenantService(tenantRepo, workspaceRepo, tenantMemberRepo, systemRoleRepo, userAccessHistoryRepo)
	workspaceService := organizationsvc.NewWorkspaceService(workspaceRepo, tenantRepo, workspaceMemberRepo, userAccessHistoryRepo)
	systemRoleService := accesssvc.NewSystemRoleService(systemRoleRepo, userRepo)
	tenantMemberService := organizationsvc.NewTenantMemberService(tenantMemberRepo, userRepo)
	folderService := catalogsvc.NewFolderService(folderRepo)
	tagService := catalogsvc.NewTagService(tagRepo)
	workspaceMemberService := organizationsvc.NewWorkspaceMemberService(workspaceMemberRepo, userRepo)
	userAccessHistoryService := accesssvc.NewUserAccessHistoryService(userAccessHistoryRepo)
	workspaceInjectableService := injectablesvc.NewWorkspaceInjectableService(workspaceInjectableRepo)
	systemInjectableService := injectablesvc.NewSystemInjectableService(systemInjectableRepo, nil)

	// Create services - Content
	injectableService := injectablesvc.NewInjectableService(injectableRepo, systemInjectableRepo, nil, workspaceRepo, tenantRepo, nil)

	// Create content validator
	contentValidator := contentvalidator.New(injectableService)

	// Create services - Content
	templateService := templatesvc.NewTemplateService(templateRepo, templateVersionRepo, templateTagRepo)
	templateVersionService := templatesvc.NewTemplateVersionService(
		templateVersionRepo,
		templateVersionInjectableRepo,
		templateVersionSignerRoleRepo,
		templateRepo,
		templateTagRepo,
		contentValidator,
		workspaceRepo,
	)

	// Create repositories - Document/Execution
	docRepo := documentrepo.New(pool)
	docRecipientRepo := documentrecipientrepo.New(pool)
	docEventRepo := documenteventrepo.New(pool)

	// Mock signing provider
	mockSigningAdapter := mocksigning.New()

	// Mock PDF renderer
	mockPDFRenderer := &MockPDFRenderer{}

	// Local storage in temp dir
	storageDir := t.TempDir()
	storageAdapter, err := localstorage.New(storageDir)
	require.NoError(t, err, "failed to create local storage adapter")

	// Event emitter + notification
	eventEmitter := documentsvc.NewEventEmitter(docEventRepo)
	noopNotifier := noopnotification.New()
	notificationSvc := documentsvc.NewNotificationService(noopNotifier, docRecipientRepo, docRepo)

	// Access token repo
	docAccessTokenRepo := documentaccesstokenrepo.New(pool)

	// Document service
	documentService := documentsvc.NewDocumentService(
		docRepo,
		docRecipientRepo,
		templateVersionRepo,
		templateVersionSignerRoleRepo,
		mockPDFRenderer,
		mockSigningAdapter,
		storageAdapter,
		eventEmitter,
		notificationSvc,
		30, // expirationDays
		docAccessTokenRepo,
	)

	// Create mappers
	injectableMapper := mapper.NewInjectableMapper()
	templateVersionMapper := mapper.NewTemplateVersionMapper(injectableMapper)
	tagMapper := mapper.NewTagMapper()
	folderMapper := mapper.NewFolderMapper()
	templateMapper := mapper.NewTemplateMapper(templateVersionMapper, tagMapper, folderMapper)
	workspaceInjectableMapper := mapper.NewInjectableMapper()

	// Create middleware provider (nil pool + bootstrap disabled for tests)
	middlewareProvider := middleware.NewProvider(
		nil, false,
		userRepo,
		systemRoleRepo,
		workspaceRepo,
		workspaceMemberRepo,
		tenantMemberRepo,
	)

	// Create controllers - Admin, Me, Tenant, Workspace
	adminController := controller.NewAdminController(tenantService, systemRoleService, systemInjectableService)
	meController := controller.NewMeController(tenantService, tenantMemberRepo, workspaceMemberRepo, userAccessHistoryService)
	tenantController := controller.NewTenantController(tenantService, workspaceService, tenantMemberService)
	workspaceController := controller.NewWorkspaceController(
		workspaceService,
		folderService,
		tagService,
		workspaceMemberService,
		workspaceInjectableService,
		workspaceInjectableMapper,
	)

	// Create controllers - Content
	// Note: RenderController is nil for tests (no PDF renderer configured)
	templateVersionController := controller.NewTemplateVersionController(templateVersionService, templateVersionMapper, templateMapper, nil)
	injectableController := controller.NewContentInjectableController(
		injectableService,
		injectableMapper,
	)
	templateController := controller.NewContentTemplateController(
		templateService,
		templateMapper,
		templateVersionController,
	)

	// Create controllers - Document & Webhook
	documentController := controller.NewDocumentController(documentService, eventEmitter)
	webhookHandlers := map[string]port.WebhookHandler{
		"mock": mockSigningAdapter,
	}
	webhookController := controller.NewWebhookController(documentService, webhookHandlers)

	// Build engine with middleware chain
	engine := gin.New()
	engine.Use(gin.Recovery())

	// Empty auth config = dev mode (no OIDC providers, uses ParseUnverified)
	// This allows unsigned test tokens to be accepted
	authCfg := &config.AuthConfig{}

	// API v1 group with middleware chain
	v1 := engine.Group("/api/v1")
	v1.Use(middleware.Operation())
	v1.Use(middleware.MultiOIDCAuth(authCfg.GetAllOIDCProviders()))
	v1.Use(middlewareProvider.IdentityContext())
	v1.Use(middlewareProvider.SystemRoleContext())

	// Register routes
	adminController.RegisterRoutes(v1)
	meController.RegisterRoutes(v1)
	tenantController.RegisterRoutes(v1, middlewareProvider)
	workspaceController.RegisterRoutes(v1, middlewareProvider)
	injectableController.RegisterRoutes(v1, middlewareProvider)
	templateController.RegisterRoutes(v1, middlewareProvider)

	// Document routes (within workspace context)
	wsGroup := v1.Group("", middlewareProvider.WorkspaceContext())
	documentController.RegisterRoutes(wsGroup)

	// Webhook routes (no auth, registered on engine root)
	webhookController.RegisterRoutes(engine)

	// Create test server
	server := httptest.NewServer(engine)
	t.Cleanup(func() { server.Close() })

	return &TestServer{
		Server:             server,
		Engine:             engine,
		Pool:               pool,
		MockSigningAdapter: mockSigningAdapter,
		t:                  t,
	}
}

// URL returns the base URL of the test server.
func (ts *TestServer) URL() string {
	return ts.Server.URL
}

// Close closes the test server.
func (ts *TestServer) Close() {
	ts.Server.Close()
}
