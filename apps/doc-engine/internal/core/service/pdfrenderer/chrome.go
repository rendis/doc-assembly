package pdfrenderer

import (
	"context"
	"fmt"
	"net/url"
	"sync"
	"time"

	"github.com/chromedp/cdproto/page"
	"github.com/chromedp/chromedp"

	"github.com/doc-assembly/doc-engine/internal/core/entity/portabledoc"
)

// ChromeRenderer handles PDF generation using headless Chrome.
type ChromeRenderer struct {
	allocCtx    context.Context
	allocCancel context.CancelFunc
	mu          sync.Mutex
	opts        ChromeOptions
}

// ChromeOptions configures the Chrome renderer.
type ChromeOptions struct {
	// Timeout is the maximum time to wait for PDF generation.
	Timeout time.Duration

	// Headless runs Chrome in headless mode (default: true).
	Headless bool

	// DisableGPU disables GPU acceleration (recommended for servers).
	DisableGPU bool

	// NoSandbox disables Chrome sandbox (required in some Docker environments).
	NoSandbox bool
}

// DefaultChromeOptions returns sensible default options.
func DefaultChromeOptions() ChromeOptions {
	return ChromeOptions{
		Timeout:    30 * time.Second,
		Headless:   true,
		DisableGPU: true,
		NoSandbox:  true,
	}
}

// NewChromeRenderer creates a new Chrome-based PDF renderer.
func NewChromeRenderer(opts ChromeOptions) (*ChromeRenderer, error) {
	chromedpOpts := []chromedp.ExecAllocatorOption{
		chromedp.Headless,
		chromedp.DisableGPU,
	}

	if opts.NoSandbox {
		chromedpOpts = append(chromedpOpts, chromedp.NoSandbox)
	}

	// Add default options
	chromedpOpts = append(chromedp.DefaultExecAllocatorOptions[:], chromedpOpts...)

	allocCtx, allocCancel := chromedp.NewExecAllocator(context.Background(), chromedpOpts...)

	return &ChromeRenderer{
		allocCtx:    allocCtx,
		allocCancel: allocCancel,
		opts:        opts,
	}, nil
}

// GeneratePDF converts HTML to PDF using the given page configuration.
func (r *ChromeRenderer) GeneratePDF(ctx context.Context, html string, pageConfig portabledoc.PageConfig) ([]byte, error) {
	r.mu.Lock()
	defer r.mu.Unlock()

	// Create a new browser context for this request
	taskCtx, cancel := chromedp.NewContext(r.allocCtx)
	defer cancel()

	// Apply timeout
	taskCtx, cancel = context.WithTimeout(taskCtx, r.opts.Timeout)
	defer cancel()

	// Convert page config to PDF parameters
	paperWidth, paperHeight := r.pageSizeInches(&pageConfig)
	marginTop, marginBottom, marginLeft, marginRight := r.marginsInches(&pageConfig)

	var pdfBuf []byte

	// Navigate to the HTML content and print to PDF
	err := chromedp.Run(taskCtx,
		chromedp.Navigate("data:text/html;charset=utf-8,"+url.PathEscape(html)),
		chromedp.ActionFunc(func(ctx context.Context) error {
			var err error
			pdfBuf, _, err = page.PrintToPDF().
				WithPaperWidth(paperWidth).
				WithPaperHeight(paperHeight).
				WithMarginTop(marginTop).
				WithMarginBottom(marginBottom).
				WithMarginLeft(marginLeft).
				WithMarginRight(marginRight).
				WithPrintBackground(true).
				WithPreferCSSPageSize(false).
				Do(ctx)
			return err
		}),
	)

	if err != nil {
		return nil, fmt.Errorf("failed to generate PDF: %w", err)
	}

	return pdfBuf, nil
}

// pageSizeInches converts page config dimensions (pixels at 96 DPI) to inches.
func (r *ChromeRenderer) pageSizeInches(config *portabledoc.PageConfig) (width, height float64) {
	const ppi = 96.0
	return config.Width / ppi, config.Height / ppi
}

// marginsInches converts margin config (pixels at 96 DPI) to inches.
func (r *ChromeRenderer) marginsInches(config *portabledoc.PageConfig) (top, bottom, left, right float64) {
	const ppi = 96.0
	return config.Margins.Top / ppi,
		config.Margins.Bottom / ppi,
		config.Margins.Left / ppi,
		config.Margins.Right / ppi
}

// Close releases Chrome resources.
func (r *ChromeRenderer) Close() error {
	if r.allocCancel != nil {
		r.allocCancel()
	}
	return nil
}
