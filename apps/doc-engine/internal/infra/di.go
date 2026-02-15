package infra

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/google/wire"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/doc-assembly/doc-engine/internal/adapters/primary/http/controller"
	"github.com/doc-assembly/doc-engine/internal/adapters/primary/http/mapper"
	"github.com/doc-assembly/doc-engine/internal/adapters/primary/http/middleware"
	"github.com/doc-assembly/doc-engine/internal/adapters/secondary/database/postgres"
	documenteventrepo "github.com/doc-assembly/doc-engine/internal/adapters/secondary/database/postgres/document_event_repo"
	documentrecipientrepo "github.com/doc-assembly/doc-engine/internal/adapters/secondary/database/postgres/document_recipient_repo"
	documentrepo "github.com/doc-assembly/doc-engine/internal/adapters/secondary/database/postgres/document_repo"
	documenttyperepo "github.com/doc-assembly/doc-engine/internal/adapters/secondary/database/postgres/document_type_repo"
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
	noopnotification "github.com/doc-assembly/doc-engine/internal/adapters/secondary/notification/noop"
	smtpnotification "github.com/doc-assembly/doc-engine/internal/adapters/secondary/notification/smtp"
	"github.com/doc-assembly/doc-engine/internal/adapters/secondary/signing/documenso"
	localstorage "github.com/doc-assembly/doc-engine/internal/adapters/secondary/storage/local"
	s3storage "github.com/doc-assembly/doc-engine/internal/adapters/secondary/storage/s3"
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
	"github.com/doc-assembly/doc-engine/internal/infra/scheduler"
	"github.com/doc-assembly/doc-engine/internal/infra/server"
)

// ProviderSet is the Wire provider set for infrastructure components.
var ProviderSet = wire.NewSet(
	// Configuration
	config.Load,
	ProvideServerConfig,
	ProvideAuthConfig,
	ProvideSchedulerConfig,

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
	documenttyperepo.New,

	// Repositories - Execution
	documentrepo.New,
	documentrecipientrepo.New,
	documenteventrepo.New,

	// Signing Provider
	ProvideSigningConfig,
	ProvideSigningProvider,
	ProvideWebhookHandlers,

	// Storage
	ProvideStorageAdapter,

	// Notification
	ProvideNotificationProvider,

	// Services - Organization
	organizationsvc.NewWorkspaceService,
	organizationsvc.NewWorkspaceMemberService,
	organizationsvc.NewTenantService,
	organizationsvc.NewTenantMemberService,

	// Services - Catalog
	catalogsvc.NewFolderService,
	catalogsvc.NewTagService,
	catalogsvc.NewDocumentTypeService,

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
	ProvideDocumentService,
	documentsvc.NewEventEmitter,
	documentsvc.NewNotificationService,
	ProvideDocumentGenerator,
	ProvideInternalDocumentService,

	// Content Validator
	ProvideContentValidator,

	// PDF Renderer
	ProvideTypstConfig,
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
	controller.NewDocumentTypeController,

	// Render Authenticator (nil = use OIDC)
	ProvideRenderAuthenticator,

	// Workspace Injectable Provider (nil = no custom provider)
	ProvideWorkspaceInjectableProvider,

	// HTTP Server
	server.NewHTTPServer,

	// Background Scheduler
	ProvideScheduler,

	// Initializer
	NewInitializer,
)

// ProvideServerConfig extracts server config from the main config.
func ProvideServerConfig(cfg *config.Config) *config.ServerConfig {
	return &cfg.Server
}

// ProvideAuthConfig extracts auth config from the main config.
func ProvideAuthConfig(cfg *config.Config) *config.AuthConfig {
	return &cfg.Auth
}

// ProvideRenderAuthenticator returns nil (no custom render auth in base doc-assembly).
// Override via Wire to provide a custom RenderAuthenticator implementation.
func ProvideRenderAuthenticator() port.RenderAuthenticator {
	return nil
}

// ProvideWorkspaceInjectableProvider returns nil (no custom provider in base doc-assembly).
// Override via Wire to provide a custom WorkspaceInjectableProvider implementation.
func ProvideWorkspaceInjectableProvider() port.WorkspaceInjectableProvider {
	return nil
}

// ProvideDBPool creates the database connection pool.
// In dummy auth mode, seeds the default admin user and SUPERADMIN role.
func ProvideDBPool(cfg *config.Config) (*pgxpool.Pool, error) {
	pool, err := postgres.NewPool(context.Background(), &cfg.Database)
	if err != nil {
		return nil, err
	}

	if cfg.Auth.IsDummyAuth() {
		userID, seedErr := seedDummyUser(context.Background(), pool)
		if seedErr != nil {
			return nil, fmt.Errorf("seeding dummy user: %w", seedErr)
		}
		cfg.DummyAuthUserID = userID
		slog.InfoContext(context.Background(), "dummy auth user seeded", slog.String("user_id", userID))
	}

	return pool, nil
}

// seedDummyUser ensures a default admin user and SUPERADMIN role exist in the DB.
func seedDummyUser(ctx context.Context, pool *pgxpool.Pool) (string, error) {
	const (
		email      = "admin@docengine.local"
		fullName   = "Doc Engine Admin"
		externalID = "00000000-0000-0000-0000-000000000001"
	)

	var userID string
	err := pool.QueryRow(ctx, `
		INSERT INTO identity.users (email, external_identity_id, full_name, status)
		VALUES ($1, $2, $3, 'ACTIVE')
		ON CONFLICT (email) DO UPDATE SET full_name = EXCLUDED.full_name
		RETURNING id
	`, email, externalID, fullName).Scan(&userID)
	if err != nil {
		return "", fmt.Errorf("upserting dummy user: %w", err)
	}

	_, err = pool.Exec(ctx, `
		INSERT INTO identity.system_roles (user_id, role)
		VALUES ($1, 'SUPERADMIN')
		ON CONFLICT (user_id) DO NOTHING
	`, userID)
	if err != nil {
		return "", fmt.Errorf("upserting dummy system role: %w", err)
	}

	return userID, nil
}

// ProvideContentValidator creates the content validator service.
func ProvideContentValidator(injectableUC injectableuc.InjectableUseCase) port.ContentValidator {
	return contentvalidator.New(injectableUC)
}

// ProvideTypstConfig extracts Typst config from the main config.
func ProvideTypstConfig(cfg *config.Config) *config.TypstConfig {
	return &cfg.Typst
}

// ProvidePDFRenderer creates the Typst-based PDF renderer service.
func ProvidePDFRenderer(typstCfg *config.TypstConfig) (port.PDFRenderer, error) {
	opts := pdfrenderer.TypstOptions{
		BinPath:        typstCfg.BinPath,
		Timeout:        typstCfg.TimeoutDuration(),
		FontDirs:       typstCfg.FontDirs,
		MaxConcurrent:  typstCfg.MaxConcurrent,
		AcquireTimeout: typstCfg.AcquireTimeoutDuration(),
	}

	var imageCache *pdfrenderer.ImageCache
	if typstCfg.ImageCacheDir != "" || typstCfg.ImageCacheMaxAgeSeconds > 0 {
		var err error
		imageCache, err = pdfrenderer.NewImageCache(pdfrenderer.ImageCacheOptions{
			Dir:             typstCfg.ImageCacheDir,
			MaxAge:          typstCfg.ImageCacheMaxAgeDuration(),
			CleanupInterval: typstCfg.ImageCacheCleanupIntervalDuration(),
		})
		if err != nil {
			return nil, fmt.Errorf("failed to create image cache: %w", err)
		}
	}

	// Design tokens for Typst rendering.
	tokens := pdfrenderer.DefaultDesignTokens()

	// Converter factory: creates a real Typst converter for node-by-node conversion.
	factory := pdfrenderer.NewTypstConverterFactory(tokens)

	return pdfrenderer.NewService(opts, imageCache, factory, tokens)
}

// ProvideSigningConfig extracts signing config from the main config.
func ProvideSigningConfig(cfg *config.Config) *documenso.Config {
	return &documenso.Config{
		APIKey:         cfg.Signing.APIKey,
		BaseURL:        cfg.Signing.BaseURL,
		SigningBaseURL: cfg.Signing.SigningBaseURL,
		WebhookSecret:  cfg.Signing.WebhookSecret,
		WebhookURL:     cfg.Signing.WebhookURL,
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

// ProvideStorageAdapter creates the storage adapter based on the configured provider.
func ProvideStorageAdapter(cfg *config.Config) (port.StorageAdapter, error) {
	switch cfg.Storage.Provider {
	case "s3":
		return s3storage.New(&s3storage.Config{
			Bucket:   cfg.Storage.Bucket,
			Region:   cfg.Storage.Region,
			Endpoint: cfg.Storage.Endpoint,
		})
	default:
		return localstorage.New(cfg.Storage.LocalDir)
	}
}

// ProvideSchedulerConfig extracts scheduler config from the main config.
func ProvideSchedulerConfig(cfg *config.Config) *config.SchedulerConfig {
	return &cfg.Scheduler
}

// ProvideDocumentService creates the document service with expiration config.
func ProvideDocumentService(
	documentRepo port.DocumentRepository,
	recipientRepo port.DocumentRecipientRepository,
	versionRepo port.TemplateVersionRepository,
	signerRoleRepo port.TemplateVersionSignerRoleRepository,
	pdfRenderer port.PDFRenderer,
	signingProvider port.SigningProvider,
	storageAdapter port.StorageAdapter,
	eventEmitter *documentsvc.EventEmitter,
	notificationSvc *documentsvc.NotificationService,
	schedulerCfg *config.SchedulerConfig,
) documentuc.DocumentUseCase {
	return documentsvc.NewDocumentService(
		documentRepo,
		recipientRepo,
		versionRepo,
		signerRoleRepo,
		pdfRenderer,
		signingProvider,
		storageAdapter,
		eventEmitter,
		notificationSvc,
		schedulerCfg.ExpirationDays,
	)
}

// ProvideNotificationProvider creates the notification provider based on config.
func ProvideNotificationProvider(cfg *config.Config) port.NotificationProvider {
	switch cfg.Notification.Provider {
	case "smtp":
		return smtpnotification.New(&smtpnotification.Config{
			Host:     cfg.Notification.Host,
			Port:     cfg.Notification.Port,
			Username: cfg.Notification.Username,
			Password: cfg.Notification.Password,
			From:     cfg.Notification.From,
		})
	default:
		return noopnotification.New()
	}
}

// ProvideScheduler creates the background job scheduler and registers polling jobs.
func ProvideScheduler(cfg *config.SchedulerConfig, docUC documentuc.DocumentUseCase) *scheduler.Scheduler {
	s := scheduler.New(cfg.Enabled)
	s.RegisterJob("poll-pending-documents", cfg.PollingIntervalDuration(), func(ctx context.Context) error {
		return docUC.ProcessPendingDocuments(ctx, cfg.PollingBatchSize)
	})
	s.RegisterJob("expire-documents", cfg.PollingIntervalDuration(), func(ctx context.Context) error {
		return docUC.ExpireDocuments(ctx, cfg.PollingBatchSize)
	})
	s.RegisterJob("retry-error-documents", cfg.RetryIntervalDuration(), func(ctx context.Context) error {
		return docUC.RetryErrorDocuments(ctx, cfg.RetryMaxRetries, cfg.RetryBatchSize)
	})
	return s
}
