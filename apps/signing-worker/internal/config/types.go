package config

import "time"

// Config represents the complete worker configuration.
type Config struct {
	Environment string         `mapstructure:"environment"`
	Database    DatabaseConfig `mapstructure:"database"`
	Worker      WorkerConfig   `mapstructure:"worker"`
	Storage     StorageConfig  `mapstructure:"storage"`
	Signing     SigningConfig  `mapstructure:"signing"`
	Logging     LoggingConfig  `mapstructure:"logging"`
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

// WorkerConfig holds worker-specific configuration.
type WorkerConfig struct {
	PollIntervalSeconds int `mapstructure:"poll_interval_seconds"`
	BatchSize           int `mapstructure:"batch_size"`
}

// PollInterval returns the poll interval as time.Duration.
func (w WorkerConfig) PollInterval() time.Duration {
	return time.Duration(w.PollIntervalSeconds) * time.Second
}

// StorageConfig holds S3/MinIO storage configuration.
type StorageConfig struct {
	Provider string `mapstructure:"provider"` // s3, gcs, azure
	Bucket   string `mapstructure:"bucket"`
	Region   string `mapstructure:"region"`
	Endpoint string `mapstructure:"endpoint"` // For MinIO/LocalStack
}

// SigningConfig holds signing provider configuration.
type SigningConfig struct {
	Provider string `mapstructure:"provider"` // docuseal, pandadoc, docusign
	APIKey   string `mapstructure:"api_key"`
	BaseURL  string `mapstructure:"base_url"`
}

// LoggingConfig holds logging configuration.
type LoggingConfig struct {
	Level  string `mapstructure:"level"`
	Format string `mapstructure:"format"`
}
