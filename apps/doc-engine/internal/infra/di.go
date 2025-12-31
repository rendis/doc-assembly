package infra

import (
	"context"
	"log/slog"
	"time"

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
	useraccesshistoryrepo "github.com/doc-assembly/doc-engine/internal/adapters/secondary/database/postgres/user_access_history_repo"
	userrepo "github.com/doc-assembly/doc-engine/internal/adapters/secondary/database/postgres/user_repo"
	workspacememberrepo "github.com/doc-assembly/doc-engine/internal/adapters/secondary/database/postgres/workspace_member_repo"
	workspacerepo "github.com/doc-assembly/doc-engine/internal/adapters/secondary/database/postgres/workspace_repo"
	"github.com/doc-assembly/doc-engine/internal/adapters/secondary/extractor"
	"github.com/doc-assembly/doc-engine/internal/adapters/secondary/llm"
	"github.com/doc-assembly/doc-engine/internal/core/port"
	"github.com/doc-assembly/doc-engine/internal/core/service"
	"github.com/doc-assembly/doc-engine/internal/core/service/contentvalidator"
	"github.com/doc-assembly/doc-engine/internal/core/service/contractgenerator"
	"github.com/doc-assembly/doc-engine/internal/core/service/pdfrenderer"
	"github.com/doc-assembly/doc-engine/internal/core/usecase"
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
	useraccesshistoryrepo.New,

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
	service.NewUserAccessHistoryService,

	// Services - Content
	service.NewInjectableService,
	service.NewTemplateService,
	service.NewTemplateVersionService,

	// Content Validator
	ProvideContentValidator,

	// PDF Renderer
	ProvidePDFRenderer,

	// LLM Client and Contract Generator
	ProvideLLMConfig,
	ProvideLLMClient,
	ProvidePromptLoader,
	ProvideExtractorFactory,
	wire.Bind(new(port.ContentExtractorFactory), new(*extractor.Factory)),
	ProvideContractGeneratorService,
	wire.Bind(new(usecase.ContractGeneratorUseCase), new(*contractgenerator.Service)),

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
	controller.NewContractGeneratorController,

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
func ProvideContentValidator(injectableRepo port.InjectableRepository) port.ContentValidator {
	return contentvalidator.New(injectableRepo)
}

// ProvidePDFRenderer creates the PDF renderer service.
func ProvidePDFRenderer() (port.PDFRenderer, error) {
	opts := pdfrenderer.DefaultChromeOptions()
	return pdfrenderer.NewService(opts)
}

// ProvideLLMConfig extracts LLM config from the main config.
func ProvideLLMConfig(cfg *config.Config) *config.LLMConfig {
	return &cfg.LLM
}

// ProvideLLMClient creates the LLM client using the factory and executes health check.
// Health check failure is logged but does not block service startup.
func ProvideLLMClient(cfg *config.LLMConfig) (port.LLMClient, error) {
	factory := llm.NewFactory()

	client, err := factory.CreateClient(cfg)
	if err != nil {
		slog.Warn("LLM client creation failed - AI generation service will be unavailable",
			slog.String("provider", cfg.Provider),
			slog.Any("error", err),
		)
		return nil, nil // Return nil client, service will handle gracefully
	}

	// Health check (ping) - log result but don't block startup
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := client.Ping(ctx); err != nil {
		slog.Warn("LLM health check failed - AI generation service may be degraded",
			slog.String("provider", client.ProviderName()),
			slog.Any("error", err),
		)
	} else {
		slog.Info("LLM client initialized successfully",
			slog.String("provider", client.ProviderName()),
		)
	}

	return client, nil
}

// ProvidePromptLoader creates the prompt loader for contract generation.
func ProvidePromptLoader(cfg *config.LLMConfig) *contractgenerator.PromptLoader {
	promptFile := cfg.PromptFile
	if promptFile == "" {
		promptFile = "contract_generator_prompt.txt"
	}
	return contractgenerator.NewPromptLoader(promptFile)
}

// ProvideExtractorFactory creates the content extractor factory.
func ProvideExtractorFactory() *extractor.Factory {
	return extractor.NewFactory()
}

// ProvideContractGeneratorService creates the contract generator service.
func ProvideContractGeneratorService(
	llmClient port.LLMClient,
	extractorFactory port.ContentExtractorFactory,
	promptLoader *contractgenerator.PromptLoader,
) *contractgenerator.Service {
	return contractgenerator.NewService(llmClient, extractorFactory, promptLoader)
}
