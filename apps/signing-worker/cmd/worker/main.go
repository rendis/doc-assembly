package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"os/signal"
	"syscall"

	"github.com/doc-assembly/signing-worker/internal/adapter/db"
	"github.com/doc-assembly/signing-worker/internal/adapter/signing/docuseal"
	"github.com/doc-assembly/signing-worker/internal/adapter/storage/s3"
	"github.com/doc-assembly/signing-worker/internal/config"
	"github.com/doc-assembly/signing-worker/internal/port"
	"github.com/doc-assembly/signing-worker/internal/worker"
)

func main() {
	if err := run(); err != nil {
		slog.Error("worker failed", "error", err)
		os.Exit(1)
	}
}

func run() error {
	// Load configuration
	cfg, err := config.Load()
	if err != nil {
		return fmt.Errorf("loading config: %w", err)
	}

	// Setup logging
	setupLogging(cfg.Logging)

	// Create context with cancellation
	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	// Create database pool
	pool, err := db.NewPool(ctx, &cfg.Database)
	if err != nil {
		return fmt.Errorf("creating database pool: %w", err)
	}
	defer pool.Close()

	// Create document repository
	docRepo := db.NewDocumentRepository(pool)

	// Create storage adapter
	storage, err := createStorageAdapter(&cfg.Storage)
	if err != nil {
		return fmt.Errorf("creating storage adapter: %w", err)
	}

	// Create signing provider
	provider, err := createSigningProvider(&cfg.Signing)
	if err != nil {
		return fmt.Errorf("creating signing provider: %w", err)
	}

	// Create and run worker
	w := worker.New(docRepo, storage, provider, &cfg.Worker)

	slog.InfoContext(ctx, "starting signing-worker",
		"provider", cfg.Signing.Provider,
		"storage", cfg.Storage.Provider,
		"environment", cfg.Environment,
	)

	return w.Run(ctx)
}

func setupLogging(cfg config.LoggingConfig) {
	var level slog.Level
	switch cfg.Level {
	case "debug":
		level = slog.LevelDebug
	case "warn":
		level = slog.LevelWarn
	case "error":
		level = slog.LevelError
	default:
		level = slog.LevelInfo
	}

	var handler slog.Handler
	opts := &slog.HandlerOptions{Level: level}

	if cfg.Format == "json" {
		handler = slog.NewJSONHandler(os.Stdout, opts)
	} else {
		handler = slog.NewTextHandler(os.Stdout, opts)
	}

	slog.SetDefault(slog.New(handler))
}

func createStorageAdapter(cfg *config.StorageConfig) (port.StorageAdapter, error) {
	switch cfg.Provider {
	case "s3", "":
		return s3.New(&s3.Config{
			Bucket:   cfg.Bucket,
			Region:   cfg.Region,
			Endpoint: cfg.Endpoint,
		})
	default:
		return nil, fmt.Errorf("unsupported storage provider: %s", cfg.Provider)
	}
}

func createSigningProvider(cfg *config.SigningConfig) (port.SigningProvider, error) {
	switch cfg.Provider {
	case "docuseal", "":
		return docuseal.New(&docuseal.Config{
			APIKey:  cfg.APIKey,
			BaseURL: cfg.BaseURL,
		})
	default:
		return nil, fmt.Errorf("unsupported signing provider: %s", cfg.Provider)
	}
}
