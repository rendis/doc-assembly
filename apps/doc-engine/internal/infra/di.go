package infra

import (
	"context"

	"github.com/google/wire"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/doc-assembly/doc-engine/internal/adapters/primary/http/controller"
	"github.com/doc-assembly/doc-engine/internal/adapters/primary/http/mapper"
	"github.com/doc-assembly/doc-engine/internal/adapters/primary/http/middleware"
	"github.com/doc-assembly/doc-engine/internal/adapters/secondary/database/postgres"
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
	userrepo "github.com/doc-assembly/doc-engine/internal/adapters/secondary/database/postgres/user_repo"
	workspacememberrepo "github.com/doc-assembly/doc-engine/internal/adapters/secondary/database/postgres/workspace_member_repo"
	workspacerepo "github.com/doc-assembly/doc-engine/internal/adapters/secondary/database/postgres/workspace_repo"
	"github.com/doc-assembly/doc-engine/internal/core/service"
	"github.com/doc-assembly/doc-engine/internal/infra/config"
	"github.com/doc-assembly/doc-engine/internal/infra/server"
)

// ProviderSet is the Wire provider set for infrastructure components.
var ProviderSet = wire.NewSet(
	// Configuration
	config.Load,
	ProvideDatabaseConfig,
	ProvideServerConfig,
	ProvideAuthConfig,

	// Database
	ProvideDBPool,

	// Repositories - Organizational
	workspacerepo.New,
	tenantrepo.New,
	folderrepo.New,
	tagrepo.New,
	userrepo.New,
	workspacememberrepo.New,
	tenantmemberrepo.New,
	systemrolerepo.New,

	// Repositories - Content
	injectablerepo.New,
	templaterepo.New,
	templatetagrepo.New,
	templateversionrepo.New,
	templateversioninjectablerepo.New,
	templateversionsignerrolerepo.New,

	// Services - Organizational
	service.NewWorkspaceService,
	service.NewFolderService,
	service.NewTagService,
	service.NewWorkspaceMemberService,
	service.NewTenantService,
	service.NewTenantMemberService,
	service.NewSystemRoleService,

	// Services - Content
	service.NewInjectableService,
	service.NewTemplateService,
	service.NewTemplateVersionService,

	// Mappers
	mapper.NewInjectableMapper,
	mapper.NewTagMapper,
	mapper.NewFolderMapper,
	mapper.NewTemplateVersionMapper,
	mapper.NewTemplateMapper,

	// Middleware Provider
	middleware.NewProvider,

	// Controllers
	controller.NewWorkspaceController,
	controller.NewTemplateVersionController,
	controller.NewContentInjectableController,
	controller.NewContentTemplateController,
	controller.NewAdminController,
	controller.NewMeController,
	controller.NewTenantController,

	// HTTP Server
	server.NewHTTPServer,

	// Initializer
	NewInitializer,
)

// ProvideDatabaseConfig extracts database config from the main config.
func ProvideDatabaseConfig(cfg *config.Config) *config.DatabaseConfig {
	return &cfg.Database
}

// ProvideServerConfig extracts server config from the main config.
func ProvideServerConfig(cfg *config.Config) *config.ServerConfig {
	return &cfg.Server
}

// ProvideAuthConfig extracts auth config from the main config.
func ProvideAuthConfig(cfg *config.Config) *config.AuthConfig {
	return &cfg.Auth
}

// ProvideDBPool creates the database connection pool.
func ProvideDBPool(cfg *config.DatabaseConfig) (*pgxpool.Pool, error) {
	return postgres.NewPool(context.Background(), cfg)
}
