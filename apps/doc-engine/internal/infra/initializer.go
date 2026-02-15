package infra

import (
	"context"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/doc-assembly/doc-engine/internal/adapters/secondary/database/postgres"
	"github.com/doc-assembly/doc-engine/internal/infra/scheduler"
	"github.com/doc-assembly/doc-engine/internal/infra/server"
)

// Initializer holds all components that need to be started and stopped.
type Initializer struct {
	httpServer *server.HTTPServer
	dbPool     *pgxpool.Pool
	scheduler  *scheduler.Scheduler
}

// NewInitializer creates a new initializer with all required components.
func NewInitializer(
	httpServer *server.HTTPServer,
	dbPool *pgxpool.Pool,
	scheduler *scheduler.Scheduler,
) *Initializer {
	return &Initializer{
		httpServer: httpServer,
		dbPool:     dbPool,
		scheduler:  scheduler,
	}
}

// Run starts all services and waits for shutdown signal.
func (i *Initializer) Run() error {
	// Setup context with cancellation
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Setup signal handling
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

	// Start background scheduler
	i.scheduler.Start(ctx)

	// Start HTTP server in goroutine
	errChan := make(chan error, 1)
	go func() {
		if err := i.httpServer.Start(ctx); err != nil {
			errChan <- err
		}
	}()

	// Wait for shutdown signal or error
	select {
	case sig := <-sigChan:
		slog.InfoContext(ctx, "received shutdown signal", slog.String("signal", sig.String()))
		cancel()
	case err := <-errChan:
		slog.ErrorContext(ctx, "server error", slog.String("error", err.Error()))
		return err
	}

	// Cleanup
	i.cleanup()

	return nil
}

// cleanup performs graceful cleanup of all resources.
func (i *Initializer) cleanup() {
	ctx := context.Background()
	slog.InfoContext(ctx, "cleaning up resources")

	// Stop background scheduler
	i.scheduler.Stop()

	// Close database pool
	postgres.Close(i.dbPool)

	slog.InfoContext(ctx, "cleanup complete")
}
