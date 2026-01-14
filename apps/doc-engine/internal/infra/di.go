package infra

import (
	"context"

	"github.com/google/wire"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/doc-assembly/doc-engine/internal/adapters/primary/http/controller"
	"github.com/doc-assembly/doc-engine/internal/adapters/primary/http/mapper"
	"github.com/doc-assembly/doc-engine/internal/adapters/primary/http/middleware"
	"github.com/doc-assembly/doc-engine/internal/adapters/secondary/database/postgres"
	documentrecipientrepo "github.com/doc-assembly/doc-engine/internal/adapters/secondary/database/postgres/document_recipient_repo"
	documentrepo "github.com/doc-assembly/doc-engine/internal/adapters/secondary/database/postgres/document_repo"
	folderrepo "github.com/doc-assembly/doc-engine/internal/adapters/secondary/database/postgres/folder_repo"
	injectablerepo "github.com/doc-assembly/doc-engine/internal/adapters/secondary/database/postgres/injectable_repo"
	systeminjectablerepo "github.com/doc-assembly/doc-engine/internal/adapters/secondary/database/postgres/system_injectable_repo"
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
	"github.com/doc-assembly/doc-engine/internal/adapters/secondary/signing/documenso"
	"github.com/doc-assembly/doc-engine/internal/core/port"
	accesssvc "github.com/doc-assembly/doc-engine/internal/core/service/access"
	catalogsvc "github.com/doc-assembly/doc-engine/internal/core/service/catalog"
	documentsvc "github.com/doc-assembly/doc-engine/internal/core/service/document"
	injectablesvc "github.com/doc-assembly/doc-engine/internal/core/service/injectable"
	organizationsvc "github.com/doc-assembly/doc-engine/internal/core/service/organization"
	"github.com/doc-assembly/doc-engine/internal/core/service/rendering/pdfrenderer"
	templatesvc "github.com/doc-assembly/doc-engine/internal/core/service/template"
	"github.com/doc-assembly/doc-engine/internal/core/service/template/contentvalidator"
	documentuc "github.com/doc-assembly/doc-engine/internal/core/usecase/document"
	injectableuc "github.com/doc-assembly/doc-engine/internal/core/usecase/injectable"
	"github.com/doc-assembly/doc-engine/internal/extensions"
	"github.com/doc-assembly/doc-engine/internal/infra/config"
	"github.com/doc-assembly/doc-engine/internal/infra/registry"
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
	useraccesshistoryrepo.New,

	// Repositories - Content
	injectablerepo.New,
	systeminjectablerepo.New,
	workspaceinjectablerepo.New,
	templaterepo.New,
	templatetagrepo.New,
	templateversionrepo.New,
	templateversioninjectablerepo.New,
	templateversionsignerrolerepo.New,

	// Repositories - Execution
	documentrepo.New,
	documentrecipientrepo.New,

	// Signing Provider
	ProvideDocumensoConfig,
	ProvideSigningProvider,
	ProvideWebhookHandlers,

	// Services - Organization
	organizationsvc.NewWorkspaceService,
	organizationsvc.NewWorkspaceMemberService,
	organizationsvc.NewTenantService,
	organizationsvc.NewTenantMemberService,

	// Services - Catalog
	catalogsvc.NewFolderService,
	catalogsvc.NewTagService,

	// Services - Access
	accesssvc.NewSystemRoleService,
	accesssvc.NewUserAccessHistoryService,

	// Services - Injectable
	injectablesvc.NewInjectableService,
	injectablesvc.NewWorkspaceInjectableService,
	injectablesvc.NewSystemInjectableService,

	// Services - Template
	templatesvc.NewTemplateService,
	templatesvc.NewTemplateVersionService,

	// Services - Document
	documentsvc.NewDocumentService,
	ProvideDocumentGenerator,
	ProvideInternalDocumentService,

	// Content Validator
	ProvideContentValidator,

	// PDF Renderer
	ProvidePDFRenderer,

	// Extensibility - Registries and Resolver
	config.LoadInjectorI18n,
	ProvideInjectorRegistry,
	ProvideMapperRegistry,
	ProvideExtensionDeps,
	ProvideInjectableResolver,

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
	controller.NewRenderController,
	controller.NewTemplateVersionController,
	controller.NewContentInjectableController,
	controller.NewContentTemplateController,
	controller.NewAdminController,
	controller.NewMeController,
	controller.NewTenantController,
	controller.NewDocumentController,
	controller.NewWebhookController,
	controller.NewInternalDocumentController,

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

// ProvideContentValidator creates the content validator service.
func ProvideContentValidator(injectableUC injectableuc.InjectableUseCase) port.ContentValidator {
	return contentvalidator.New(injectableUC)
}

// ProvidePDFRenderer creates the PDF renderer service.
func ProvidePDFRenderer() (port.PDFRenderer, error) {
	opts := pdfrenderer.DefaultChromeOptions()
	return pdfrenderer.NewService(opts)
}

// ProvideDocumensoConfig extracts Documenso config from the main config.
func ProvideDocumensoConfig(cfg *config.Config) *documenso.Config {
	return &documenso.Config{
		APIKey:        cfg.Documenso.APIKey,
		BaseURL:       cfg.Documenso.APIURL,
		WebhookSecret: cfg.Documenso.WebhookSecret,
	}
}

// ProvideSigningProvider creates the signing provider (Documenso adapter).
func ProvideSigningProvider(cfg *documenso.Config) (port.SigningProvider, error) {
	return documenso.New(cfg)
}

// ProvideWebhookHandlers creates the map of webhook handlers by provider name.
func ProvideWebhookHandlers(cfg *documenso.Config) (map[string]port.WebhookHandler, error) {
	documensoAdapter, err := documenso.New(cfg)
	if err != nil {
		return nil, err
	}

	return map[string]port.WebhookHandler{
		"documenso": documensoAdapter,
	}, nil
}

// ProvideInjectorRegistry creates the injector registry with i18n support and registers all extensions.
func ProvideInjectorRegistry(
	i18n *config.InjectorI18nConfig,
	mapReg port.MapperRegistry,
	deps *extensions.InitDeps,
) port.InjectorRegistry {
	injReg := registry.NewInjectorRegistry(i18n)
	extensions.RegisterAll(injReg, mapReg, deps)
	return injReg
}

// ProvideMapperRegistry creates the mapper registry.
func ProvideMapperRegistry() port.MapperRegistry {
	return registry.NewMapperRegistry()
}

// ProvideExtensionDeps creates the dependencies for extension init functions.
func ProvideExtensionDeps() *extensions.InitDeps {
	return &extensions.InitDeps{}
}

// ProvideInjectableResolver creates the injectable resolver service.
func ProvideInjectableResolver(reg port.InjectorRegistry) *injectablesvc.InjectableResolverService {
	return injectablesvc.NewInjectableResolverService(reg)
}

// ProvideDocumentGenerator creates the document generator service.
func ProvideDocumentGenerator(
	templateRepo port.TemplateRepository,
	versionRepo port.TemplateVersionRepository,
	documentRepo port.DocumentRepository,
	recipientRepo port.DocumentRecipientRepository,
	injectableUC injectableuc.InjectableUseCase,
	mapperRegistry port.MapperRegistry,
	resolver *injectablesvc.InjectableResolverService,
) *documentsvc.DocumentGenerator {
	return documentsvc.NewDocumentGenerator(
		templateRepo,
		versionRepo,
		documentRepo,
		recipientRepo,
		injectableUC,
		mapperRegistry,
		resolver,
	)
}

// ProvideInternalDocumentService creates the internal document service.
func ProvideInternalDocumentService(
	generator *documentsvc.DocumentGenerator,
	documentRepo port.DocumentRepository,
	recipientRepo port.DocumentRecipientRepository,
	pdfRenderer port.PDFRenderer,
	signingProvider port.SigningProvider,
) documentuc.InternalDocumentUseCase {
	return documentsvc.NewInternalDocumentService(
		generator,
		documentRepo,
		recipientRepo,
		pdfRenderer,
		signingProvider,
	)
}
