package scheduler

import (
	"context"
	"sync/atomic"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
)

func TestScheduler_RegisterJob(t *testing.T) {
	s := New(true)
	s.RegisterJob("test-job", time.Second, func(_ context.Context) error {
		return nil
	})

	assert.Len(t, s.jobs, 1)
	assert.Equal(t, "test-job", s.jobs[0].Name)
	assert.Equal(t, time.Second, s.jobs[0].Interval)
}

func TestScheduler_StartAndJobRuns(t *testing.T) {
	s := New(true)

	var count atomic.Int32
	s.RegisterJob("counter", 50*time.Millisecond, func(_ context.Context) error {
		count.Add(1)
		return nil
	})

	ctx := context.Background()
	s.Start(ctx)

	// Wait for the job to fire at least once
	assert.Eventually(t, func() bool {
		return count.Load() >= 1
	}, 500*time.Millisecond, 10*time.Millisecond)

	s.Stop()
}

func TestScheduler_StopGracefully(t *testing.T) {
	s := New(true)

	var running atomic.Bool
	running.Store(true)

	s.RegisterJob("long-job", 50*time.Millisecond, func(_ context.Context) error {
		return nil
	})

	ctx := context.Background()
	s.Start(ctx)

	// Stop should not hang
	done := make(chan struct{})
	go func() {
		s.Stop()
		running.Store(false)
		close(done)
	}()

	select {
	case <-done:
		assert.False(t, running.Load())
	case <-time.After(2 * time.Second):
		t.Fatal("Stop did not complete within timeout")
	}
}

func TestScheduler_DisabledDoesNotRun(t *testing.T) {
	s := New(false) // disabled

	var count atomic.Int32
	s.RegisterJob("should-not-run", 50*time.Millisecond, func(_ context.Context) error {
		count.Add(1)
		return nil
	})

	ctx := context.Background()
	s.Start(ctx)

	time.Sleep(200 * time.Millisecond)
	assert.Equal(t, int32(0), count.Load())

	// Stop on disabled scheduler should not panic
	s.Stop()
}
