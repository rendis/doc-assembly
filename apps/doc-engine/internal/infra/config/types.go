package config

import "time"

// Config represents the complete application configuration.
type Config struct {
	Environment string            `mapstructure:"environment"`
	Server      ServerConfig      `mapstructure:"server"`
	Database    DatabaseConfig    `mapstructure:"database"`
	Auth        AuthConfig        `mapstructure:"auth"`
	InternalAPI InternalAPIConfig `mapstructure:"internal_api"`
	Documenso   DocumensoConfig   `mapstructure:"documenso"`
	Storage     StorageConfig     `mapstructure:"storage"`
	Logging     LoggingConfig     `mapstructure:"logging"`
	Chrome      ChromeConfig      `mapstructure:"chrome"`
}

// ServerConfig holds HTTP server configuration.
type ServerConfig struct {
	Port            string `mapstructure:"port"`
	ReadTimeout     int    `mapstructure:"read_timeout"`
	WriteTimeout    int    `mapstructure:"write_timeout"`
	ShutdownTimeout int    `mapstructure:"shutdown_timeout"`
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

// AuthConfig holds JWT/JWKS authentication configuration.
type AuthConfig struct {
	JWKSURL  string `mapstructure:"jwks_url"`
	Issuer   string `mapstructure:"issuer"`
	Audience string `mapstructure:"audience"`
}

// InternalAPIConfig holds configuration for internal service-to-service API.
type InternalAPIConfig struct {
	Enabled bool   `mapstructure:"enabled"`
	APIKey  string `mapstructure:"api_key"`
}

// DocumensoConfig holds Documenso API configuration.
type DocumensoConfig struct {
	APIURL        string `mapstructure:"api_url"`
	APIKey        string `mapstructure:"api_key"`
	WebhookSecret string `mapstructure:"webhook_secret"`
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

// ChromeConfig holds Chrome browser pool configuration.
type ChromeConfig struct {
	TimeoutSeconds int  `mapstructure:"timeout_seconds"`
	PoolSize       int  `mapstructure:"pool_size"`
	Headless       bool `mapstructure:"headless"`
	DisableGPU     bool `mapstructure:"disable_gpu"`
	NoSandbox      bool `mapstructure:"no_sandbox"`
}

// TimeoutDuration returns the timeout as time.Duration.
func (c ChromeConfig) TimeoutDuration() time.Duration {
	return time.Duration(c.TimeoutSeconds) * time.Second
}
