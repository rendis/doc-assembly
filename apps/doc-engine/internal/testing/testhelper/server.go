//go:build integration

package testhelper

import (
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/doc-assembly/doc-engine/internal/adapters/primary/http/controller"
	"github.com/doc-assembly/doc-engine/internal/adapters/primary/http/mapper"
	"github.com/doc-assembly/doc-engine/internal/adapters/primary/http/middleware"
	folderrepo "github.com/doc-assembly/doc-engine/internal/adapters/secondary/database/postgres/folder_repo"
	injectablerepo "github.com/doc-assembly/doc-engine/internal/adapters/secondary/database/postgres/injectable_repo"
	systemrolerepo "github.com/doc-assembly/doc-engine/internal/adapters/secondary/database/postgres/system_role_repo"
	tagrepo "github.com/doc-assembly/doc-engine/internal/adapters/secondary/database/postgres/tag_repo"
	templaterepo "github.com/doc-assembly/doc-engine/internal/adapters/secondary/database/postgres/template_repo"
	templatetagrepo "github.com/doc-assembly/doc-engine/internal/adapters/secondary/database/postgres/template_tag_repo"
	templateversioninjectablerepo "github.com/doc-assembly/doc-engine/internal/adapters/secondary/database/postgres/template_version_injectable_repo"
	templateversionrepo "github.com/doc-assembly/doc-engine/internal/adapters/secondary/database/postgres/template_version_repo"
	templateversionsignerrolerepo "github.com/doc-assembly/doc-engine/internal/adapters/secondary/database/postgres/template_version_signer_role_repo"
	tenantmemberrepo "github.com/doc-assembly/doc-engine/internal/adapters/secondary/database/postgres/tenant_member_repo"
	tenantrepo "github.com/doc-assembly/doc-engine/internal/adapters/secondary/database/postgres/tenant_repo"
	useraccesshistoryrepo "github.com/doc-assembly/doc-engine/internal/adapters/secondary/database/postgres/user_access_history_repo"
	userrepo "github.com/doc-assembly/doc-engine/internal/adapters/secondary/database/postgres/user_repo"
	workspaceinjectablerepo "github.com/doc-assembly/doc-engine/internal/adapters/secondary/database/postgres/workspace_injectable_repo"
	workspacememberrepo "github.com/doc-assembly/doc-engine/internal/adapters/secondary/database/postgres/workspace_member_repo"
	workspacerepo "github.com/doc-assembly/doc-engine/internal/adapters/secondary/database/postgres/workspace_repo"
	"github.com/doc-assembly/doc-engine/internal/core/service"
	contentvalidator "github.com/doc-assembly/doc-engine/internal/core/service/contentvalidator"
	"github.com/doc-assembly/doc-engine/internal/infra/config"
)

// TestServer wraps an httptest.Server with helper methods for E2E testing.
type TestServer struct {
	Server *httptest.Server
	Engine *gin.Engine
	Pool   *pgxpool.Pool
	t      *testing.T
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
	templateRepo := templaterepo.New(pool)
	templateTagRepo := templatetagrepo.New(pool)
	templateVersionRepo := templateversionrepo.New(pool)
	templateVersionInjectableRepo := templateversioninjectablerepo.New(pool)
	templateVersionSignerRoleRepo := templateversionsignerrolerepo.New(pool)
	workspaceInjectableRepo := workspaceinjectablerepo.New(pool)

	// Create services - Identity & Tenancy
	tenantService := service.NewTenantService(tenantRepo, workspaceRepo, tenantMemberRepo, systemRoleRepo, userAccessHistoryRepo)
	workspaceService := service.NewWorkspaceService(workspaceRepo, tenantRepo, workspaceMemberRepo, userAccessHistoryRepo)
	systemRoleService := service.NewSystemRoleService(systemRoleRepo, userRepo)
	tenantMemberService := service.NewTenantMemberService(tenantMemberRepo, userRepo)
	folderService := service.NewFolderService(folderRepo)
	tagService := service.NewTagService(tagRepo)
	workspaceMemberService := service.NewWorkspaceMemberService(workspaceMemberRepo, userRepo)
	userAccessHistoryService := service.NewUserAccessHistoryService(userAccessHistoryRepo)
	workspaceInjectableService := service.NewWorkspaceInjectableService(workspaceInjectableRepo)

	// Create content validator
	contentValidator := contentvalidator.New(injectableRepo)

	// Create services - Content
	injectableService := service.NewInjectableService(injectableRepo, nil)
	templateService := service.NewTemplateService(templateRepo, templateVersionRepo, templateTagRepo)
	templateVersionService := service.NewTemplateVersionService(
		templateVersionRepo,
		templateVersionInjectableRepo,
		templateVersionSignerRoleRepo,
		templateRepo,
		templateTagRepo,
		contentValidator,
		workspaceRepo,
	)

	// Create mappers
	injectableMapper := mapper.NewInjectableMapper()
	templateVersionMapper := mapper.NewTemplateVersionMapper(injectableMapper)
	tagMapper := mapper.NewTagMapper()
	folderMapper := mapper.NewFolderMapper()
	templateMapper := mapper.NewTemplateMapper(templateVersionMapper, tagMapper, folderMapper)
	workspaceInjectableMapper := mapper.NewInjectableMapper()

	// Create middleware provider
	middlewareProvider := middleware.NewProvider(
		userRepo,
		systemRoleRepo,
		workspaceRepo,
		workspaceMemberRepo,
		tenantMemberRepo,
	)

	// Create controllers - Admin, Me, Tenant, Workspace
	adminController := controller.NewAdminController(tenantService, systemRoleService)
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

	// Build engine with middleware chain
	engine := gin.New()
	engine.Use(gin.Recovery())

	// Empty auth config = dev mode (no JWKS validation)
	// This allows ParseUnverified to accept our test tokens
	authCfg := &config.AuthConfig{}

	// API v1 group with middleware chain
	v1 := engine.Group("/api/v1")
	v1.Use(middleware.Operation())
	v1.Use(middleware.JWTAuth(authCfg))
	v1.Use(middlewareProvider.IdentityContext())
	v1.Use(middlewareProvider.SystemRoleContext())

	// Register routes
	adminController.RegisterRoutes(v1)
	meController.RegisterRoutes(v1)
	tenantController.RegisterRoutes(v1, middlewareProvider)
	workspaceController.RegisterRoutes(v1, middlewareProvider)
	injectableController.RegisterRoutes(v1, middlewareProvider)
	templateController.RegisterRoutes(v1, middlewareProvider)

	// Create test server
	server := httptest.NewServer(engine)
	t.Cleanup(func() { server.Close() })

	return &TestServer{
		Server: server,
		Engine: engine,
		Pool:   pool,
		t:      t,
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
