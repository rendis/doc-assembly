package pdfrenderer

import (
	"context"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func TestBrowserPool_AcquireRelease(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping browser pool test in short mode")
	}

	opts := ChromeOptions{
		PoolSize:   2,
		Timeout:    10 * time.Second,
		Headless:   true,
		DisableGPU: true,
		NoSandbox:  true,
	}

	pool, err := NewBrowserPool(opts)
	if err != nil {
		t.Fatalf("failed to create pool: %v", err)
	}
	defer pool.Close()

	// Test basic acquire/release
	browser, err := pool.Acquire(context.Background())
	if err != nil {
		t.Fatalf("failed to acquire browser: %v", err)
	}

	if browser == nil {
		t.Fatal("acquired browser is nil")
	}

	if pool.Available() != 1 {
		t.Errorf("expected 1 available, got %d", pool.Available())
	}

	pool.Release(browser)

	if pool.Available() != 2 {
		t.Errorf("expected 2 available, got %d", pool.Available())
	}
}

func TestBrowserPool_ConcurrentAccess(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping browser pool test in short mode")
	}

	poolSize := 3
	opts := ChromeOptions{
		PoolSize:   poolSize,
		Timeout:    10 * time.Second,
		Headless:   true,
		DisableGPU: true,
		NoSandbox:  true,
	}

	pool, err := NewBrowserPool(opts)
	if err != nil {
		t.Fatalf("failed to create pool: %v", err)
	}
	defer pool.Close()

	// Run more goroutines than pool size to test contention
	numGoroutines := 10
	var wg sync.WaitGroup
	var successCount atomic.Int32

	for i := 0; i < numGoroutines; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()

			browser, err := pool.Acquire(context.Background())
			if err != nil {
				return
			}

			// Simulate work
			time.Sleep(50 * time.Millisecond)
			successCount.Add(1)

			pool.Release(browser)
		}()
	}

	wg.Wait()

	if int(successCount.Load()) != numGoroutines {
		t.Errorf("expected %d successful acquisitions, got %d", numGoroutines, successCount.Load())
	}
}

func TestBrowserPool_ContextCancellation(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping browser pool test in short mode")
	}

	opts := ChromeOptions{
		PoolSize:   1,
		Timeout:    10 * time.Second,
		Headless:   true,
		DisableGPU: true,
		NoSandbox:  true,
	}

	pool, err := NewBrowserPool(opts)
	if err != nil {
		t.Fatalf("failed to create pool: %v", err)
	}
	defer pool.Close()

	// Acquire the only browser
	browser, err := pool.Acquire(context.Background())
	if err != nil {
		t.Fatalf("failed to acquire browser: %v", err)
	}

	// Try to acquire with a canceled context
	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	_, err = pool.Acquire(ctx)
	if err == nil {
		t.Error("expected error when acquiring with canceled context")
	}

	if err != context.DeadlineExceeded {
		t.Errorf("expected DeadlineExceeded, got %v", err)
	}

	pool.Release(browser)
}

func TestBrowserPool_Close(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping browser pool test in short mode")
	}

	opts := ChromeOptions{
		PoolSize:   2,
		Timeout:    10 * time.Second,
		Headless:   true,
		DisableGPU: true,
		NoSandbox:  true,
	}

	pool, err := NewBrowserPool(opts)
	if err != nil {
		t.Fatalf("failed to create pool: %v", err)
	}

	// Close the pool
	if err := pool.Close(); err != nil {
		t.Errorf("failed to close pool: %v", err)
	}

	// Try to acquire from closed pool
	_, err = pool.Acquire(context.Background())
	if err != ErrPoolClosed {
		t.Errorf("expected ErrPoolClosed, got %v", err)
	}

	// Double close should not panic
	if err := pool.Close(); err != nil {
		t.Errorf("double close returned error: %v", err)
	}
}

func TestBrowserPool_ReleaseNil(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping browser pool test in short mode")
	}

	opts := ChromeOptions{
		PoolSize:   1,
		Timeout:    10 * time.Second,
		Headless:   true,
		DisableGPU: true,
		NoSandbox:  true,
	}

	pool, err := NewBrowserPool(opts)
	if err != nil {
		t.Fatalf("failed to create pool: %v", err)
	}
	defer pool.Close()

	// Release nil should not panic
	pool.Release(nil)
}

func TestBrowserPool_Size(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping browser pool test in short mode")
	}

	opts := ChromeOptions{
		PoolSize:   5,
		Timeout:    10 * time.Second,
		Headless:   true,
		DisableGPU: true,
		NoSandbox:  true,
	}

	pool, err := NewBrowserPool(opts)
	if err != nil {
		t.Fatalf("failed to create pool: %v", err)
	}
	defer pool.Close()

	if pool.Size() != 5 {
		t.Errorf("expected size 5, got %d", pool.Size())
	}
}

func TestBrowserPool_DefaultPoolSize(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping browser pool test in short mode")
	}

	opts := ChromeOptions{
		PoolSize:   0, // Should default to 10
		Timeout:    10 * time.Second,
		Headless:   true,
		DisableGPU: true,
		NoSandbox:  true,
	}

	pool, err := NewBrowserPool(opts)
	if err != nil {
		t.Fatalf("failed to create pool: %v", err)
	}
	defer pool.Close()

	if pool.Size() != 10 {
		t.Errorf("expected default size 10, got %d", pool.Size())
	}
}
