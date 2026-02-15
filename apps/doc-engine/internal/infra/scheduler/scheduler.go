package scheduler

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"
)

// Job represents a registered background job.
type Job struct {
	Name     string
	Interval time.Duration
	Fn       func(ctx context.Context) error
}

// Scheduler runs registered jobs at configured intervals.
type Scheduler struct {
	jobs    []Job
	enabled bool
	cancel  context.CancelFunc
	wg      sync.WaitGroup
}

// New creates a new Scheduler.
func New(enabled bool) *Scheduler {
	return &Scheduler{
		enabled: enabled,
	}
}

// RegisterJob adds a job to the scheduler.
func (s *Scheduler) RegisterJob(name string, interval time.Duration, fn func(ctx context.Context) error) {
	s.jobs = append(s.jobs, Job{
		Name:     name,
		Interval: interval,
		Fn:       fn,
	})
}

// Start launches a goroutine for each registered job. If the scheduler is
// disabled, it logs a message and returns immediately.
func (s *Scheduler) Start(ctx context.Context) {
	if !s.enabled {
		slog.InfoContext(ctx, "scheduler disabled")
		return
	}

	ctx, s.cancel = context.WithCancel(ctx)

	for _, job := range s.jobs {
		s.wg.Add(1)
		go s.runJob(ctx, job)
	}

	slog.InfoContext(ctx, "scheduler started", slog.Int("job_count", len(s.jobs)))
}

// Stop cancels the scheduler context and waits for all job goroutines to finish.
func (s *Scheduler) Stop() {
	if s.cancel != nil {
		s.cancel()
	}
	s.wg.Wait()
}

// runJob executes a single job on a ticker loop, recovering from panics.
func (s *Scheduler) runJob(ctx context.Context, job Job) {
	defer s.wg.Done()

	slog.InfoContext(ctx, "job registered",
		slog.String("job", job.Name),
		slog.String("interval", job.Interval.String()),
	)

	ticker := time.NewTicker(job.Interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			slog.InfoContext(ctx, "job stopped", slog.String("job", job.Name))
			return
		case <-ticker.C:
			s.executeJob(ctx, job)
		}
	}
}

// executeJob runs a job function with panic recovery.
func (s *Scheduler) executeJob(ctx context.Context, job Job) {
	defer func() {
		if r := recover(); r != nil {
			slog.ErrorContext(ctx, "job panicked",
				slog.String("job", job.Name),
				slog.String("panic", fmt.Sprintf("%v", r)),
			)
		}
	}()

	if err := job.Fn(ctx); err != nil {
		slog.ErrorContext(ctx, "job failed",
			slog.String("job", job.Name),
			slog.String("error", err.Error()),
		)
	}
}
