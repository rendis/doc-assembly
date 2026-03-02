// Package riverqueue implements background job processing for document
// completion events using River, a PostgreSQL-native job queue.
// See docs/backend/worker-queue-guide.md for architecture and flow diagrams.
package riverqueue

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/riverqueue/river"
	"github.com/riverqueue/river/riverdriver/riverpgxv5"
	"github.com/riverqueue/river/rivermigrate"

	"github.com/rendis/doc-assembly/core/internal/core/port"
	"github.com/rendis/doc-assembly/core/internal/infra/config"
)

// RiverService manages the River client lifecycle and exposes the notifier.
type RiverService struct {
	client         *river.Client[pgx.Tx]
	notifier       *Notifier
	workersEnabled bool
}

// New creates a RiverService: runs migrations, registers the worker, and
// builds the River client. When cfg.Enabled is false the client operates in
// insert-only mode (no queue processing).
func New(
	ctx context.Context,
	pool *pgxpool.Pool,
	cfg config.WorkerConfig,
	handler port.DocumentCompletedHandler,
	docUpdater documentUpdater,
) (*RiverService, error) {
	driver := riverpgxv5.New(pool)

	// Run River schema migrations programmatically.
	migrator, err := rivermigrate.New(driver, nil)
	if err != nil {
		return nil, fmt.Errorf("creating river migrator: %w", err)
	}
	if _, err := migrator.Migrate(ctx, rivermigrate.DirectionUp, nil); err != nil {
		return nil, fmt.Errorf("running river migrations: %w", err)
	}

	// Build River config. When disabled, omit Workers and Queues so the client
	// operates in insert-only mode (River requires both or neither).
	riverCfg := &river.Config{}
	if cfg.Enabled {
		workers := river.NewWorkers()
		river.AddWorker(workers, &DocumentCompletedWorker{
			handler: handler,
			pool:    pool,
		})
		riverCfg.Workers = workers
		riverCfg.Queues = map[string]river.QueueConfig{
			river.QueueDefault: {MaxWorkers: cfg.MaxWorkersOrDefault()},
		}
	}

	client, err := river.NewClient(driver, riverCfg)
	if err != nil {
		return nil, fmt.Errorf("creating river client: %w", err)
	}

	notifier := &Notifier{
		pool:       pool,
		client:     client,
		docUpdater: docUpdater,
	}

	slog.InfoContext(ctx, "river queue initialized",
		slog.Bool("workers_enabled", cfg.Enabled),
		slog.Int("max_workers", cfg.MaxWorkersOrDefault()),
	)

	return &RiverService{
		client:         client,
		notifier:       notifier,
		workersEnabled: cfg.Enabled,
	}, nil
}

// Notifier returns the DocumentCompletionNotifier for use by the document service.
func (r *RiverService) Notifier() port.DocumentCompletionNotifier {
	return r.notifier
}

// Start begins processing jobs. No-op when workers are disabled (insert-only mode).
func (r *RiverService) Start(ctx context.Context) error {
	if !r.workersEnabled {
		return nil
	}
	return r.client.Start(ctx)
}

// Stop gracefully shuts down the River client. No-op when workers are disabled.
func (r *RiverService) Stop(ctx context.Context) error {
	if !r.workersEnabled {
		return nil
	}
	return r.client.Stop(ctx)
}
