package pdfrenderer

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"sync"

	"github.com/chromedp/chromedp"
)

// ErrPoolClosed is returned when acquiring from a closed pool.
var ErrPoolClosed = errors.New("browser pool is closed")

// BrowserInstance represents a pooled Chrome browser instance.
type BrowserInstance struct {
	allocCtx    context.Context
	allocCancel context.CancelFunc
	id          int
}

// BrowserPool manages a fixed pool of reusable Chrome browser instances.
// It uses a channel-based design (similar to database/sql) to provide
// thread-safe access to browser instances without mutex contention.
type BrowserPool struct {
	browsers chan *BrowserInstance
	opts     ChromeOptions
	mu       sync.Mutex
	closed   bool
}

// NewBrowserPool creates a new browser pool with the specified size.
// Each browser instance is a separate Chrome process that can be reused.
func NewBrowserPool(opts ChromeOptions) (*BrowserPool, error) {
	if opts.PoolSize <= 0 {
		opts.PoolSize = 10 // Default pool size
	}

	pool := &BrowserPool{
		browsers: make(chan *BrowserInstance, opts.PoolSize),
		opts:     opts,
	}

	// Pre-warm the pool with browser instances
	for i := 0; i < opts.PoolSize; i++ {
		instance, err := pool.createInstance(i)
		if err != nil {
			// Clean up already created instances
			pool.Close()
			return nil, fmt.Errorf("creating browser instance %d: %w", i, err)
		}
		pool.browsers <- instance
	}

	slog.Info("browser pool initialized", "size", opts.PoolSize)
	return pool, nil
}

// createInstance creates a new browser instance with Chrome allocator.
func (p *BrowserPool) createInstance(id int) (*BrowserInstance, error) {
	var chromedpOpts []chromedp.ExecAllocatorOption

	if p.opts.Headless {
		chromedpOpts = append(chromedpOpts, chromedp.Headless)
	}
	if p.opts.DisableGPU {
		chromedpOpts = append(chromedpOpts, chromedp.DisableGPU)
	}
	if p.opts.NoSandbox {
		chromedpOpts = append(chromedpOpts, chromedp.NoSandbox)
	}

	// Add default options
	chromedpOpts = append(chromedp.DefaultExecAllocatorOptions[:], chromedpOpts...)

	allocCtx, allocCancel := chromedp.NewExecAllocator(context.Background(), chromedpOpts...)

	// Start the browser immediately by creating and canceling a context
	// This ensures Chrome is running and ready when we need it
	warmupCtx, warmupCancel := chromedp.NewContext(allocCtx)
	if err := chromedp.Run(warmupCtx); err != nil {
		allocCancel()
		warmupCancel()
		return nil, fmt.Errorf("warming up browser: %w", err)
	}
	warmupCancel()

	return &BrowserInstance{
		allocCtx:    allocCtx,
		allocCancel: allocCancel,
		id:          id,
	}, nil
}

// Acquire obtains a browser instance from the pool.
// It blocks until an instance is available or the context is canceled.
func (p *BrowserPool) Acquire(ctx context.Context) (*BrowserInstance, error) {
	p.mu.Lock()
	if p.closed {
		p.mu.Unlock()
		return nil, ErrPoolClosed
	}
	p.mu.Unlock()

	select {
	case instance := <-p.browsers:
		if instance == nil {
			return nil, ErrPoolClosed
		}
		return instance, nil
	case <-ctx.Done():
		return nil, ctx.Err()
	}
}

// Release returns a browser instance to the pool.
// If the pool is closed, the instance is destroyed instead.
func (p *BrowserPool) Release(instance *BrowserInstance) {
	if instance == nil {
		return
	}

	p.mu.Lock()
	if p.closed {
		p.mu.Unlock()
		instance.allocCancel()
		return
	}
	p.mu.Unlock()

	select {
	case p.browsers <- instance:
		// Successfully returned to pool
	default:
		// Pool is full (shouldn't happen), destroy instance
		instance.allocCancel()
	}
}

// Close shuts down all browser instances in the pool.
func (p *BrowserPool) Close() error {
	p.mu.Lock()
	if p.closed {
		p.mu.Unlock()
		return nil
	}
	p.closed = true
	p.mu.Unlock()

	// Drain and close all instances
	close(p.browsers)
	for instance := range p.browsers {
		if instance != nil {
			instance.allocCancel()
		}
	}

	slog.Info("browser pool closed")
	return nil
}

// Size returns the configured pool size.
func (p *BrowserPool) Size() int {
	return p.opts.PoolSize
}

// Available returns the number of currently available instances.
// This is primarily for monitoring/debugging purposes.
func (p *BrowserPool) Available() int {
	return len(p.browsers)
}
