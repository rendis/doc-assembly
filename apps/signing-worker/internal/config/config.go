package config

import (
	"fmt"
	"strings"

	"github.com/spf13/viper"
)

// Load reads configuration from YAML files and environment variables.
// Environment variables take precedence over YAML values.
// Env prefix: SIGNING_WORKER_ (e.g., SIGNING_WORKER_DATABASE_HOST)
func Load() (*Config, error) {
	v := viper.New()

	// Set config file settings
	v.SetConfigName("config")
	v.SetConfigType("yaml")

	// Add config paths (searched in order)
	v.AddConfigPath("./settings")
	v.AddConfigPath("../settings")
	v.AddConfigPath("../../settings")
	v.AddConfigPath(".")

	// Environment variable settings
	v.SetEnvPrefix("SIGNING_WORKER")
	v.SetEnvKeyReplacer(strings.NewReplacer(".", "_"))
	v.AutomaticEnv()

	// Read config file
	if err := v.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); !ok {
			return nil, fmt.Errorf("reading config file: %w", err)
		}
		// Config file not found is acceptable, we'll use env vars and defaults
	}

	// Set defaults
	setDefaults(v)

	// Unmarshal into struct
	var cfg Config
	if err := v.Unmarshal(&cfg); err != nil {
		return nil, fmt.Errorf("unmarshaling config: %w", err)
	}

	return &cfg, nil
}

// setDefaults sets default configuration values.
func setDefaults(v *viper.Viper) {
	// Database defaults
	v.SetDefault("database.host", "localhost")
	v.SetDefault("database.port", 5432)
	v.SetDefault("database.user", "postgres")
	v.SetDefault("database.name", "doc_assembly")
	v.SetDefault("database.ssl_mode", "disable")
	v.SetDefault("database.max_pool_size", 5)
	v.SetDefault("database.min_pool_size", 1)
	v.SetDefault("database.max_idle_time_seconds", 300)

	// Worker defaults
	v.SetDefault("worker.poll_interval_seconds", 1)
	v.SetDefault("worker.batch_size", 10)

	// Storage defaults
	v.SetDefault("storage.provider", "s3")
	v.SetDefault("storage.region", "us-east-1")

	// Signing defaults
	v.SetDefault("signing.provider", "docuseal")

	// Logging defaults
	v.SetDefault("logging.level", "info")
	v.SetDefault("logging.format", "json")

	// Environment default
	v.SetDefault("environment", "development")
}

// MustLoad loads configuration and panics on error.
func MustLoad() *Config {
	cfg, err := Load()
	if err != nil {
		panic(fmt.Sprintf("failed to load config: %v", err))
	}
	return cfg
}
