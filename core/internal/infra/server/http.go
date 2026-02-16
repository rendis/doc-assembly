package server

import (
	"context"
	"fmt"
	"io/fs"
	"log/slog"
	"mime"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"

	"github.com/rendis/doc-assembly/core/internal/adapters/primary/http/controller"
	"github.com/rendis/doc-assembly/core/internal/adapters/primary/http/middleware"
	"github.com/rendis/doc-assembly/core/internal/core/port"
	"github.com/rendis/doc-assembly/core/internal/infra/config"

	_ "github.com/rendis/doc-assembly/core/docs" // swagger generated docs
)

func init() {
	// Register MIME types to avoid OS-level detection inconsistencies (especially on Windows).
	_ = mime.AddExtensionType(".js", "application/javascript")
	_ = mime.AddExtensionType(".css", "text/css")
	_ = mime.AddExtensionType(".woff2", "font/woff2")
	_ = mime.AddExtensionType(".svg", "image/svg+xml")
}

// @title           Doc Engine API
// @version         1.0
// @description     Document Assembly System API - Template management and document generation

// @contact.name    API Support
// @contact.email   support@example.com

// @license.name    MIT
// @license.url     https://opensource.org/licenses/MIT

// @host            localhost:8080
// @BasePath        /api/v1

// @securityDefinitions.apikey BearerAuth
// @in              header
// @name            Authorization
// @description     Type "Bearer" followed by a space and JWT token

// HTTPServer represents the HTTP server instance.
type HTTPServer struct {
	engine *gin.Engine
	config *config.ServerConfig
}

// NewHTTPServer creates a new HTTP server with all routes and middleware configured.
func NewHTTPServer(
	cfg *config.Config,
	middlewareProvider *middleware.Provider,
	workspaceController *controller.WorkspaceController,
	injectableController *controller.ContentInjectableController,
	templateController *controller.ContentTemplateController,
	adminController *controller.AdminController,
	meController *controller.MeController,
	tenantController *controller.TenantController,
	documentTypeController *controller.DocumentTypeController,
	documentController *controller.DocumentController,
	webhookController *controller.WebhookController,
	internalDocController *controller.InternalDocumentController,
	renderAuthenticator port.RenderAuthenticator,
	frontendFS fs.FS,
) *HTTPServer {
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	engine := gin.New()
	engine.Use(gin.Recovery())
	engine.Use(gin.Logger())
	engine.Use(corsMiddleware(cfg.Server.CORS))

	engine.GET("/health", healthHandler)
	engine.GET("/ready", readyHandler)
	engine.GET("/api/v1/config", clientConfigHandler(cfg))
	if cfg.Server.SwaggerUI {
		engine.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))
	}

	registerInternalRoutes(engine, cfg, internalDocController)

	requestTimeout := cfg.Server.WriteTimeoutDuration() - 2*time.Second
	if requestTimeout <= 0 {
		requestTimeout = 28 * time.Second
	}

	v1 := setupPanelRoutes(engine, cfg, middlewareProvider, requestTimeout)
	registerPanelControllers(v1, middlewareProvider, adminController, meController,
		tenantController, documentTypeController, workspaceController,
		injectableController, templateController, documentController)

	webhookController.RegisterRoutes(engine)
	setupRenderRoutes(engine, cfg, renderAuthenticator, requestTimeout)

	// Serve embedded SPA if frontendFS is provided, otherwise return 404 for unmatched routes.
	if frontendFS != nil {
		serveSPA(engine, frontendFS)
	} else {
		engine.NoRoute(func(c *gin.Context) {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
		})
	}

	return &HTTPServer{
		engine: engine,
		config: &cfg.Server,
	}
}

// registerInternalRoutes registers internal API routes with API key authentication.
func registerInternalRoutes(engine *gin.Engine, cfg *config.Config, internalDocController *controller.InternalDocumentController) {
	if cfg.InternalAPI.Enabled && cfg.InternalAPI.APIKey != "" {
		internalV1 := engine.Group("/api/v1")
		internalV1.Use(middleware.Operation())
		internalDocController.RegisterRoutes(internalV1, cfg.InternalAPI.APIKey)
		slog.InfoContext(context.Background(), "internal API routes registered")
	} else {
		slog.WarnContext(context.Background(), "internal API routes disabled (no API key configured)")
	}
}

// setupPanelRoutes creates the panel route group with authentication middleware.
// Uses DummyAuth in dev mode or PanelAuth + IdentityContext + SystemRoleContext in production.
func setupPanelRoutes(
	engine *gin.Engine,
	cfg *config.Config,
	middlewareProvider *middleware.Provider,
	requestTimeout time.Duration,
) *gin.RouterGroup {
	v1 := engine.Group("/api/v1")
	v1.Use(noCacheAPI())
	v1.Use(middleware.Operation())
	v1.Use(middleware.RequestTimeout(requestTimeout))

	if cfg.Auth.IsDummyAuth() {
		v1.Use(middleware.DummyAuth())
		v1.Use(middleware.DummyIdentityAndRoles(cfg.DummyAuthUserID))
	} else {
		v1.Use(middleware.PanelAuth(&cfg.Auth))
		v1.Use(middlewareProvider.IdentityContext())
		v1.Use(middlewareProvider.SystemRoleContext())
	}

	return v1
}

// registerPanelControllers registers all panel route controllers.
func registerPanelControllers(
	v1 *gin.RouterGroup,
	middlewareProvider *middleware.Provider,
	adminController *controller.AdminController,
	meController *controller.MeController,
	tenantController *controller.TenantController,
	documentTypeController *controller.DocumentTypeController,
	workspaceController *controller.WorkspaceController,
	injectableController *controller.ContentInjectableController,
	templateController *controller.ContentTemplateController,
	documentController *controller.DocumentController,
) {
	v1.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"message": "pong"})
	})

	adminController.RegisterRoutes(v1)
	meController.RegisterRoutes(v1)
	tenantController.RegisterRoutes(v1, middlewareProvider)
	documentTypeController.RegisterRoutes(v1, middlewareProvider)
	workspaceController.RegisterRoutes(v1, middlewareProvider)
	injectableController.RegisterRoutes(v1, middlewareProvider)
	templateController.RegisterRoutes(v1, middlewareProvider)

	// Document routes (within workspace context)
	wsGroup := v1.Group("", middlewareProvider.WorkspaceContext())
	documentController.RegisterRoutes(wsGroup)
}

// setupRenderRoutes creates the render route group with separate auth.
// Auth priority: dummy > custom RenderAuthenticator > OIDC.
// Render routes skip DB identity lookup for stateless operation.
func setupRenderRoutes(
	engine *gin.Engine,
	cfg *config.Config,
	renderAuthenticator port.RenderAuthenticator,
	requestTimeout time.Duration,
) {
	renderGroup := engine.Group("/api/v1/render")
	renderGroup.Use(noCacheAPI())
	renderGroup.Use(middleware.Operation())
	renderGroup.Use(middleware.RequestTimeout(requestTimeout))

	switch {
	case cfg.Auth.IsDummyAuth():
		renderGroup.Use(middleware.DummyAuth())
	case renderAuthenticator != nil:
		renderGroup.Use(middleware.CustomRenderAuth(renderAuthenticator))
	default:
		renderGroup.Use(middleware.RenderAuth(&cfg.Auth))
		renderGroup.Use(middleware.RenderClaimsContext())
	}

	// Render routes will be registered here when render endpoints are added.
	// Example: renderController.RegisterWorkspaceRoutes(renderGroup)
}

// Start starts the HTTP server.
func (s *HTTPServer) Start(ctx context.Context) error {
	addr := fmt.Sprintf(":%s", s.config.Port)

	srv := &http.Server{
		Addr:         addr,
		Handler:      s.engine,
		ReadTimeout:  s.config.ReadTimeoutDuration(),
		WriteTimeout: s.config.WriteTimeoutDuration(),
	}

	// Channel to catch server errors
	errChan := make(chan error, 1)

	// Start server in goroutine
	go func() {
		slog.InfoContext(ctx, "starting HTTP server", slog.String("addr", addr))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errChan <- err
		}
	}()

	// Wait for context cancellation or server error
	select {
	case <-ctx.Done():
		slog.InfoContext(ctx, "shutting down HTTP server")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), s.config.ShutdownTimeoutDuration())
		defer cancel()

		if err := srv.Shutdown(shutdownCtx); err != nil {
			return fmt.Errorf("server shutdown: %w", err)
		}
		slog.InfoContext(shutdownCtx, "HTTP server stopped gracefully")
		return nil

	case err := <-errChan:
		return fmt.Errorf("server error: %w", err)
	}
}

// Engine returns the underlying Gin engine.
// Useful for testing.
func (s *HTTPServer) Engine() *gin.Engine {
	return s.engine
}

// healthHandler returns OK if the service is running.
func healthHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status":  "healthy",
		"service": "doc-engine",
	})
}

// readyHandler returns OK if the service is ready to accept traffic.
func readyHandler(c *gin.Context) {
	// TODO: Add database connectivity check
	c.JSON(http.StatusOK, gin.H{
		"status": "ready",
	})
}

// clientConfigHandler returns a handler that exposes non-sensitive config to the frontend.
func clientConfigHandler(cfg *config.Config) gin.HandlerFunc {
	type providerInfo struct {
		Name               string `json:"name"`
		Issuer             string `json:"issuer"`
		TokenEndpoint      string `json:"tokenEndpoint,omitempty"`
		UserinfoEndpoint   string `json:"userinfoEndpoint,omitempty"`
		EndSessionEndpoint string `json:"endSessionEndpoint,omitempty"`
		ClientID           string `json:"clientId,omitempty"`
	}

	type clientConfig struct {
		DummyAuth     bool          `json:"dummyAuth"`
		PanelProvider *providerInfo `json:"panelProvider,omitempty"`
	}

	var panelProvider *providerInfo
	if panel := cfg.Auth.GetPanelOIDC(); panel != nil {
		panelProvider = &providerInfo{
			Name:               panel.Name,
			Issuer:             panel.Issuer,
			TokenEndpoint:      panel.TokenEndpoint,
			UserinfoEndpoint:   panel.UserinfoEndpoint,
			EndSessionEndpoint: panel.EndSessionEndpoint,
			ClientID:           panel.ClientID,
		}
	}

	resp := clientConfig{
		DummyAuth:     cfg.Auth.IsDummyAuth(),
		PanelProvider: panelProvider,
	}

	return func(c *gin.Context) {
		c.JSON(http.StatusOK, resp)
	}
}

// noCacheAPI ensures browsers never cache API responses.
// Without explicit Cache-Control headers, Chrome applies heuristic caching to GET
// requests, which can cause stale or corrupted cache entries that result in requests
// stuck as "pending" indefinitely — even across page reloads.
func noCacheAPI() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
		c.Header("Pragma", "no-cache")
		c.Header("Expires", "0")
		c.Next()
	}
}

// corsMiddleware configures CORS for the API using allowed origins from config.
// Access-Control-Allow-Origin only accepts a single origin or "*".
// When multiple origins are configured, we check the request Origin header
// and respond with that origin if it's in the allowed list.
func corsMiddleware(corsCfg config.CORSConfig) gin.HandlerFunc {
	allowed := make(map[string]bool, len(corsCfg.AllowedOrigins))
	wildcard := false
	for _, o := range corsCfg.AllowedOrigins {
		if o == "*" {
			wildcard = true
		}
		allowed[o] = true
	}
	if len(corsCfg.AllowedOrigins) == 0 {
		wildcard = true
	}

	baseHeaders := []string{
		"Origin", "Content-Type", "Accept", "Authorization",
		"Cache-Control", "Pragma",
		"X-Workspace-ID", "X-Tenant-ID", "X-Tenant-Code", "X-Sandbox-Mode", "X-API-Key",
		"X-External-ID", "X-Template-ID", "X-Transactional-ID",
	}
	allowedHeaders := strings.Join(append(baseHeaders, corsCfg.AllowedHeaders...), ", ")

	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")

		if wildcard {
			c.Header("Access-Control-Allow-Origin", "*")
		} else if allowed[origin] {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Vary", "Origin")
		}

		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", allowedHeaders)
		c.Header("Access-Control-Expose-Headers", "Content-Length")
		c.Header("Access-Control-Allow-Credentials", "true")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}

// serveSPA registers static file serving + SPA fallback for the embedded frontend.
// Static files are served with long cache headers. Non-API, non-file requests
// fall back to index.html for client-side routing.
func serveSPA(engine *gin.Engine, frontendFS fs.FS) {
	fileServer := http.FileServer(http.FS(frontendFS))

	engine.NoRoute(func(c *gin.Context) {
		path := c.Request.URL.Path

		// API routes that weren't matched → 404 JSON
		if strings.HasPrefix(path, "/api/") {
			c.JSON(http.StatusNotFound, gin.H{"error": "not found"})
			return
		}

		// Try to serve the exact file
		if f, err := frontendFS.Open(strings.TrimPrefix(path, "/")); err == nil {
			_ = f.Close()
			// Cache static assets aggressively (JS, CSS, fonts, images contain content hashes)
			if strings.Contains(path, "/assets/") {
				c.Header("Cache-Control", "public, max-age=31536000, immutable")
			}
			fileServer.ServeHTTP(c.Writer, c.Request)
			return
		}

		// SPA fallback: serve index.html for all other routes
		c.Request.URL.Path = "/"
		fileServer.ServeHTTP(c.Writer, c.Request)
	})
}
