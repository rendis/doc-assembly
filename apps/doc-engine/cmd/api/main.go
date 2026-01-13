package main

import (
	"context"
	"log/slog"
	"os"

	"github.com/doc-assembly/doc-engine/internal/infra/logging"
)

func main() {
	ctx := context.Background()

	// Setup structured logging with context-based handler
	handler := logging.NewContextHandler(
		slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
			Level: slog.LevelInfo,
		}),
	)
	slog.SetDefault(slog.New(handler))

	slog.InfoContext(ctx, "starting doc-engine service")

	// Initialize application with Wire
	app, err := InitializeApp()
	if err != nil {
		slog.ErrorContext(ctx, "failed to initialize application", slog.String("error", err.Error()))
		os.Exit(1)
	}

	// Run the application
	if err := app.Run(); err != nil {
		slog.ErrorContext(ctx, "application error", slog.String("error", err.Error()))
		os.Exit(1)
	}

	slog.InfoContext(ctx, "doc-engine service stopped")
}
