package server

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"

	"github.com/gin-gonic/gin"

	"github.com/doc-assembly/doc-engine/internal/adapters/primary/http/controller"
	"github.com/doc-assembly/doc-engine/internal/adapters/primary/http/middleware"
	"github.com/doc-assembly/doc-engine/internal/infra/config"
)

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
) *HTTPServer {
	// Set Gin mode based on environment
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	engine := gin.New()

	// Global middleware
	engine.Use(gin.Recovery())
	engine.Use(gin.Logger())
	engine.Use(corsMiddleware())

	// Health check endpoint (no auth required)
	engine.GET("/health", healthHandler)
	engine.GET("/ready", readyHandler)

	// API v1 routes with authentication
	v1 := engine.Group("/api/v1")
	v1.Use(middleware.Operation())
	v1.Use(middleware.JWTAuth(&cfg.Auth))
	v1.Use(middlewareProvider.IdentityContext())
	v1.Use(middlewareProvider.SystemRoleContext()) // Load system role if exists (optional)
	{
		// Placeholder ping endpoint
		v1.GET("/ping", func(c *gin.Context) {
			c.JSON(http.StatusOK, gin.H{"message": "pong"})
		})

		// =====================================================
		// SYSTEM ROUTES - No X-Workspace-ID or X-Tenant-ID required
		// Requires system roles (SUPERADMIN or PLATFORM_ADMIN)
		// =====================================================
		adminController.RegisterRoutes(v1)

		// =====================================================
		// ME ROUTES - User-specific routes, no tenant/workspace required
		// Only requires authentication
		// =====================================================
		meController.RegisterRoutes(v1)

		// =====================================================
		// TENANT ROUTES - Requires X-Tenant-ID header
		// Requires tenant roles (TENANT_OWNER or TENANT_ADMIN)
		// =====================================================
		tenantController.RegisterRoutes(v1, middlewareProvider)

		// =====================================================
		// WORKSPACE ROUTES - Requires X-Workspace-ID header
		// Operations within a specific workspace
		// =====================================================
		workspaceController.RegisterRoutes(v1, middlewareProvider)

		// =====================================================
		// CONTENT ROUTES - Requires X-Workspace-ID header
		// =====================================================
		injectableController.RegisterRoutes(v1, middlewareProvider)
		templateController.RegisterRoutes(v1, middlewareProvider)
	}

	return &HTTPServer{
		engine: engine,
		config: &cfg.Server,
	}
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
		slog.Info("starting HTTP server", slog.String("addr", addr))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			errChan <- err
		}
	}()

	// Wait for context cancellation or server error
	select {
	case <-ctx.Done():
		slog.Info("shutting down HTTP server")
		shutdownCtx, cancel := context.WithTimeout(context.Background(), s.config.ShutdownTimeoutDuration())
		defer cancel()

		if err := srv.Shutdown(shutdownCtx); err != nil {
			return fmt.Errorf("server shutdown: %w", err)
		}
		slog.Info("HTTP server stopped gracefully")
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

// corsMiddleware configures CORS for the API.
func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-Workspace-ID, X-Tenant-ID, X-Sandbox-Mode")
		c.Header("Access-Control-Expose-Headers", "Content-Length")
		c.Header("Access-Control-Allow-Credentials", "true")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	}
}
