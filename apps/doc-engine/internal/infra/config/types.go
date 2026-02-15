package config

import "time"

// Config represents the complete application configuration.
type Config struct {
	Environment string            `mapstructure:"environment"`
	Server      ServerConfig      `mapstructure:"server"`
	Database    DatabaseConfig    `mapstructure:"database"`
	Auth        AuthConfig        `mapstructure:"auth"`
	InternalAPI InternalAPIConfig `mapstructure:"internal_api"`
	Signing     SigningConfig     `mapstructure:"signing"`
	Storage     StorageConfig     `mapstructure:"storage"`
	Logging     LoggingConfig     `mapstructure:"logging"`
	Typst       TypstConfig       `mapstructure:"typst"`
	Bootstrap   BootstrapConfig   `mapstructure:"bootstrap"`

	// DummyAuthUserID is the internal DB user ID for dummy auth mode.
	// Set at runtime after seeding the dummy user (not loaded from YAML).
	DummyAuthUserID string `mapstructure:"-"`
}

// ServerConfig holds HTTP server configuration.
type ServerConfig struct {
	Port            string     `mapstructure:"port"`
	ReadTimeout     int        `mapstructure:"read_timeout"`
	WriteTimeout    int        `mapstructure:"write_timeout"`
	ShutdownTimeout int        `mapstructure:"shutdown_timeout"`
	SwaggerUI       bool       `mapstructure:"swagger_ui"`
	CORS            CORSConfig `mapstructure:"cors"`
}

// CORSConfig holds CORS configuration.
type CORSConfig struct {
	AllowedOrigins []string `mapstructure:"allowed_origins"`
}

// ReadTimeoutDuration returns the read timeout as time.Duration.
func (s ServerConfig) ReadTimeoutDuration() time.Duration {
	return time.Duration(s.ReadTimeout) * time.Second
}

// WriteTimeoutDuration returns the write timeout as time.Duration.
func (s ServerConfig) WriteTimeoutDuration() time.Duration {
	return time.Duration(s.WriteTimeout) * time.Second
}

// ShutdownTimeoutDuration returns the shutdown timeout as time.Duration.
func (s ServerConfig) ShutdownTimeoutDuration() time.Duration {
	return time.Duration(s.ShutdownTimeout) * time.Second
}

// DatabaseConfig holds PostgreSQL connection configuration.
type DatabaseConfig struct {
	Host               string `mapstructure:"host"`
	Port               int    `mapstructure:"port"`
	User               string `mapstructure:"user"`
	Password           string `mapstructure:"password"`
	Name               string `mapstructure:"name"`
	SSLMode            string `mapstructure:"ssl_mode"`
	MaxPoolSize        int    `mapstructure:"max_pool_size"`
	MinPoolSize        int    `mapstructure:"min_pool_size"`
	MaxIdleTimeSeconds int    `mapstructure:"max_idle_time_seconds"`
}

// MaxIdleTimeDuration returns the max idle time as time.Duration.
func (d DatabaseConfig) MaxIdleTimeDuration() time.Duration {
	return time.Duration(d.MaxIdleTimeSeconds) * time.Second
}

// AuthConfig groups authentication configuration.
// Separates panel (login/UI) auth from render-only providers.
type AuthConfig struct {
	// Dummy forces dummy auth mode (bypass JWT), regardless of OIDC config.
	// Set via DOC_ENGINE_AUTH_DUMMY=true or make run DUMMY=1.
	Dummy bool `mapstructure:"dummy"`
	// Panel is the OIDC provider for web panel login and all non-render routes.
	Panel *OIDCProvider `mapstructure:"panel"`
	// RenderProviders are additional OIDC providers accepted ONLY for render endpoints.
	// Panel provider is always valid for render too (allows UI preview).
	RenderProviders []OIDCProvider `mapstructure:"render_providers"`
}

// GetPanelOIDC returns the OIDC provider for panel (login/UI) authentication.
// Returns nil if the provider is not meaningfully configured (no issuer and no discovery URL).
func (a *AuthConfig) GetPanelOIDC() *OIDCProvider {
	if a != nil && a.Panel != nil && (a.Panel.Issuer != "" || a.Panel.DiscoveryURL != "") {
		return a.Panel
	}
	return nil
}

// GetAllOIDCProviders returns all configured OIDC providers (panel + render).
func (a *AuthConfig) GetAllOIDCProviders() []OIDCProvider {
	if a == nil {
		return nil
	}
	result := make([]OIDCProvider, 0, len(a.RenderProviders)+1)
	if panel := a.GetPanelOIDC(); panel != nil {
		result = append(result, *panel)
	}
	result = append(result, a.RenderProviders...)
	return result
}

// IsDummyAuth returns true if dummy mode is forced or no OIDC providers are configured.
func (a *AuthConfig) IsDummyAuth() bool {
	if a.Dummy {
		return true
	}
	return a.GetPanelOIDC() == nil
}

// OIDCProvider represents a single OIDC identity provider configuration.
type OIDCProvider struct {
	Name         string `mapstructure:"name"`          // Human-readable name for logging
	DiscoveryURL string `mapstructure:"discovery_url"` // OpenID Connect discovery URL (optional)
	Issuer       string `mapstructure:"issuer"`        // Expected token issuer (iss claim)
	JWKSURL      string `mapstructure:"jwks_url"`      // JWKS endpoint URL
	Audience     string `mapstructure:"audience"`      // Optional audience (aud claim)

	// Frontend OIDC endpoints (populated from discovery or manual config)
	ClientID           string `mapstructure:"client_id"`            // OIDC client ID for frontend
	TokenEndpoint      string `mapstructure:"token_endpoint"`       // Token endpoint URL
	UserinfoEndpoint   string `mapstructure:"userinfo_endpoint"`    // Userinfo endpoint URL
	EndSessionEndpoint string `mapstructure:"end_session_endpoint"` // Logout/end session endpoint URL
}

// InternalAPIConfig holds configuration for internal service-to-service API.
type InternalAPIConfig struct {
	Enabled bool   `mapstructure:"enabled"`
	APIKey  string `mapstructure:"api_key"`
}

// SigningConfig holds signing provider configuration.
type SigningConfig struct {
	Provider       string `mapstructure:"provider"` // documenso
	APIKey         string `mapstructure:"api_key"`
	BaseURL        string `mapstructure:"base_url"`
	SigningBaseURL string `mapstructure:"signing_base_url"` // Base URL for signing links (without /api/v2)
	WebhookSecret  string `mapstructure:"webhook_secret"`
	WebhookURL     string `mapstructure:"webhook_url"` // Public URL for webhook endpoint
}

// StorageConfig holds S3/MinIO storage configuration.
type StorageConfig struct {
	Bucket   string `mapstructure:"bucket"`
	Region   string `mapstructure:"region"`
	Endpoint string `mapstructure:"endpoint"`
}

// LoggingConfig holds logging configuration.
type LoggingConfig struct {
	Level  string `mapstructure:"level"`
	Format string `mapstructure:"format"`
}

// TypstConfig holds Typst-based PDF renderer configuration.
type TypstConfig struct {
	BinPath                      string   `mapstructure:"bin_path"`
	TimeoutSeconds               int      `mapstructure:"timeout_seconds"`
	FontDirs                     []string `mapstructure:"font_dirs"`
	MaxConcurrent                int      `mapstructure:"max_concurrent"`
	AcquireTimeoutSeconds        int      `mapstructure:"acquire_timeout_seconds"`
	TemplateCacheTTL             int      `mapstructure:"template_cache_ttl_seconds"`
	TemplateCacheMax             int      `mapstructure:"template_cache_max_entries"`
	ImageCacheDir                string   `mapstructure:"image_cache_dir"`
	ImageCacheMaxAgeSeconds      int      `mapstructure:"image_cache_max_age_seconds"`
	ImageCacheCleanupIntervalSec int      `mapstructure:"image_cache_cleanup_interval_seconds"`
}

// TimeoutDuration returns the compilation timeout as time.Duration.
func (t TypstConfig) TimeoutDuration() time.Duration {
	return time.Duration(t.TimeoutSeconds) * time.Second
}

// AcquireTimeoutDuration returns the semaphore acquire timeout as time.Duration.
func (t TypstConfig) AcquireTimeoutDuration() time.Duration {
	return time.Duration(t.AcquireTimeoutSeconds) * time.Second
}

// ImageCacheMaxAgeDuration returns the image cache TTL as time.Duration.
func (t TypstConfig) ImageCacheMaxAgeDuration() time.Duration {
	return time.Duration(t.ImageCacheMaxAgeSeconds) * time.Second
}

// ImageCacheCleanupIntervalDuration returns the cache cleanup interval as time.Duration.
func (t TypstConfig) ImageCacheCleanupIntervalDuration() time.Duration {
	return time.Duration(t.ImageCacheCleanupIntervalSec) * time.Second
}

// BootstrapConfig holds first-user bootstrap configuration.
type BootstrapConfig struct {
	// Enabled controls whether the first user to login is auto-created as SUPERADMIN.
	// Only takes effect when the database has zero users.
	Enabled bool `mapstructure:"enabled"`
}
