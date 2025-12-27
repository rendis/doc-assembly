package main

import (
	"log/slog"
	"os"
)

func main() {
	// Setup structured logging
	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}))
	slog.SetDefault(logger)

	slog.Info("starting doc-engine service")

	// Initialize application with Wire
	app, err := InitializeApp()
	if err != nil {
		slog.Error("failed to initialize application", slog.String("error", err.Error()))
		os.Exit(1)
	}

	// Run the application
	if err := app.Run(); err != nil {
		slog.Error("application error", slog.String("error", err.Error()))
		os.Exit(1)
	}

	slog.Info("doc-engine service stopped")
}
