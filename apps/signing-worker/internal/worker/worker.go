package worker

import (
	"context"
	"errors"
	"log/slog"
	"time"

	"github.com/doc-assembly/signing-worker/internal/adapter/db"
	"github.com/doc-assembly/signing-worker/internal/config"
	"github.com/doc-assembly/signing-worker/internal/operation"
	"github.com/doc-assembly/signing-worker/internal/port"
)

// Worker processes documents pending provider operations.
type Worker struct {
	docRepo    *db.DocumentRepository
	storage    port.StorageAdapter
	provider   port.SigningProvider
	operations *operation.Registry
	cfg        *config.WorkerConfig
}

// New creates a new worker instance.
func New(
	docRepo *db.DocumentRepository,
	storage port.StorageAdapter,
	provider port.SigningProvider,
	cfg *config.WorkerConfig,
) *Worker {
	return &Worker{
		docRepo:    docRepo,
		storage:    storage,
		provider:   provider,
		operations: operation.NewRegistry(),
		cfg:        cfg,
	}
}

// Run starts the worker loop.
func (w *Worker) Run(ctx context.Context) error {
	ticker := time.NewTicker(w.cfg.PollInterval())
	defer ticker.Stop()

	slog.InfoContext(ctx, "worker started",
		"poll_interval_seconds", w.cfg.PollIntervalSeconds,
		"batch_size", w.cfg.BatchSize,
	)

	for {
		select {
		case <-ctx.Done():
			slog.InfoContext(ctx, "worker shutting down")
			return ctx.Err()
		case <-ticker.C:
			w.processNextBatch(ctx)
		}
	}
}

// processNextBatch processes the next batch of pending documents.
func (w *Worker) processNextBatch(ctx context.Context) {
	docs, err := w.docRepo.FindByStatus(ctx, operation.StatusPendingProvider, w.cfg.BatchSize)
	if err != nil {
		slog.ErrorContext(ctx, "failed to fetch documents", "error", err)
		return
	}

	if len(docs) == 0 {
		return
	}

	slog.DebugContext(ctx, "processing batch", "count", len(docs))

	for _, doc := range docs {
		if err := w.processDocument(ctx, doc); err != nil {
			slog.ErrorContext(ctx, "process failed",
				"doc_id", doc.ID,
				"status", doc.Status,
				"error", err,
			)
		}
	}
}

// processDocument processes a single document.
func (w *Worker) processDocument(ctx context.Context, doc *port.Document) error {
	// 1. Get strategy for document status
	strategy, ok := w.operations.Get(doc.Status)
	if !ok {
		return errors.New("unknown operation type: " + doc.Status)
	}

	// 2. Execute strategy
	result, err := strategy.Execute(ctx, doc, w.provider, w.storage)

	// 3. Handle error
	if err != nil {
		if result != nil && result.ErrorMessage != "" {
			_ = w.docRepo.UpdateDocumentStatus(ctx, doc.ID, result.NewStatus, result.ErrorMessage)
		}
		return err
	}

	// 4. Update document
	if err := w.docRepo.UpdateDocumentFromResult(ctx, doc.ID, result); err != nil {
		return err
	}

	// 5. Update recipients
	for _, ru := range result.RecipientUpdates {
		if err := w.docRepo.UpdateRecipientFromResult(ctx, ru); err != nil {
			slog.ErrorContext(ctx, "failed to update recipient",
				"doc_id", doc.ID,
				"recipient_id", ru.RecipientID,
				"error", err,
			)
		}
	}

	slog.InfoContext(ctx, "operation completed",
		"doc_id", doc.ID,
		"operation", doc.Status,
		"new_status", result.NewStatus,
		"provider_doc_id", result.SignerDocumentID,
	)

	return nil
}
