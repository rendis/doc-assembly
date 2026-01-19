package pdfrenderer

import (
	"context"
	"fmt"
	"net/url"
	"time"

	"github.com/chromedp/cdproto/page"
	"github.com/chromedp/chromedp"

	"github.com/doc-assembly/doc-engine/internal/core/entity/portabledoc"
)

// pixelsPerInch is the standard CSS pixel density (96 DPI).
const pixelsPerInch = 96.0

// ChromeRenderer handles PDF generation using headless Chrome with a browser pool.
type ChromeRenderer struct {
	pool *BrowserPool
	opts ChromeOptions
}

// ChromeOptions configures the Chrome renderer.
type ChromeOptions struct {
	// Timeout is the maximum time to wait for PDF generation.
	Timeout time.Duration

	// PoolSize is the number of browser instances to maintain in the pool.
	PoolSize int

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
		PoolSize:   10,
		Headless:   true,
		DisableGPU: true,
		NoSandbox:  true,
	}
}

// NewChromeRenderer creates a new Chrome-based PDF renderer with a browser pool.
func NewChromeRenderer(opts ChromeOptions) (*ChromeRenderer, error) {
	pool, err := NewBrowserPool(opts)
	if err != nil {
		return nil, fmt.Errorf("creating browser pool: %w", err)
	}

	return &ChromeRenderer{
		pool: pool,
		opts: opts,
	}, nil
}

// GeneratePDF converts HTML to PDF using the given page configuration.
// It acquires a browser from the pool, creates a new tab, generates the PDF,
// and returns the browser to the pool for reuse.
func (r *ChromeRenderer) GeneratePDF(ctx context.Context, html string, pageConfig portabledoc.PageConfig) ([]byte, error) {
	// Acquire a browser from the pool
	browser, err := r.pool.Acquire(ctx)
	if err != nil {
		return nil, fmt.Errorf("acquiring browser from pool: %w", err)
	}
	defer r.pool.Release(browser)

	// Create a new tab context in the acquired browser
	taskCtx, cancel := chromedp.NewContext(browser.allocCtx)
	defer cancel()

	// Apply timeout
	taskCtx, cancel = context.WithTimeout(taskCtx, r.opts.Timeout)
	defer cancel()

	// Convert page config to PDF parameters
	paperWidth, paperHeight := r.pageSizeInches(&pageConfig)
	marginTop, marginBottom, marginLeft, marginRight := r.marginsInches(&pageConfig)

	var pdfBuf []byte

	// Navigate to the HTML content and print to PDF
	err = chromedp.Run(taskCtx,
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
		return nil, fmt.Errorf("generating PDF: %w", err)
	}

	return pdfBuf, nil
}

// pageSizeInches converts page config dimensions (pixels at 96 DPI) to inches.
func (r *ChromeRenderer) pageSizeInches(config *portabledoc.PageConfig) (width, height float64) {
	return config.Width / pixelsPerInch, config.Height / pixelsPerInch
}

// marginsInches converts margin config (pixels at 96 DPI) to inches.
func (r *ChromeRenderer) marginsInches(config *portabledoc.PageConfig) (top, bottom, left, right float64) {
	return config.Margins.Top / pixelsPerInch,
		config.Margins.Bottom / pixelsPerInch,
		config.Margins.Left / pixelsPerInch,
		config.Margins.Right / pixelsPerInch
}

// Close releases Chrome resources by closing the browser pool.
func (r *ChromeRenderer) Close() error {
	if r.pool != nil {
		return r.pool.Close()
	}
	return nil
}
