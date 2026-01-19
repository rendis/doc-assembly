package config

import (
	"fmt"
	"os"
	"strings"

	"github.com/spf13/viper"
)

// Load reads configuration from YAML files and environment variables.
// Environment variables take precedence over YAML values.
// Env prefix: DOC_ENGINE_ (e.g., DOC_ENGINE_SERVER_PORT)
func Load() (*Config, error) {
	v := viper.New()

	// Set config file settings
	v.SetConfigName("app")
	v.SetConfigType("yaml")

	// Add config paths (searched in order)
	v.AddConfigPath("./settings")
	v.AddConfigPath("../settings")
	v.AddConfigPath("../../settings")
	v.AddConfigPath(".")

	// Environment variable settings
	v.SetEnvPrefix("DOC_ENGINE")
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

	// Special handling for PORT env var (common in container environments)
	if cfg.Server.Port == "" {
		if port := os.Getenv("PORT"); port != "" {
			cfg.Server.Port = port
		}
	}

	return &cfg, nil
}

// setDefaults sets default configuration values.
func setDefaults(v *viper.Viper) {
	// Server defaults
	v.SetDefault("server.port", "8080")
	v.SetDefault("server.read_timeout", 30)
	v.SetDefault("server.write_timeout", 30)
	v.SetDefault("server.shutdown_timeout", 10)

	// Database defaults
	v.SetDefault("database.host", "localhost")
	v.SetDefault("database.port", 5432)
	v.SetDefault("database.user", "postgres")
	v.SetDefault("database.name", "doc_engine")
	v.SetDefault("database.ssl_mode", "disable")
	v.SetDefault("database.max_pool_size", 10)
	v.SetDefault("database.min_pool_size", 2)
	v.SetDefault("database.max_idle_time", 300)

	// Logging defaults
	v.SetDefault("logging.level", "info")
	v.SetDefault("logging.format", "json")

	// Chrome defaults
	v.SetDefault("chrome.timeout_seconds", 30)
	v.SetDefault("chrome.pool_size", 10)
	v.SetDefault("chrome.headless", true)
	v.SetDefault("chrome.disable_gpu", true)
	v.SetDefault("chrome.no_sandbox", true)

	// Environment default
	v.SetDefault("environment", "development")
}

// MustLoad loads configuration and panics on error.
// Use this only in main() or initialization code.
func MustLoad() *Config {
	cfg, err := Load()
	if err != nil {
		panic(fmt.Sprintf("failed to load config: %v", err))
	}
	return cfg
}
