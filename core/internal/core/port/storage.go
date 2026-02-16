package port

import "context"

// StorageAdapter defines the interface for object storage services.
// Implementations handle the specifics of each provider (S3, GCS, Azure Blob, etc.)
// while exposing a unified interface to the application.
type StorageAdapter interface {
	// Upload stores data with the given key and content type.
	Upload(ctx context.Context, key string, data []byte, contentType string) error

	// Download retrieves data by key.
	Download(ctx context.Context, key string) ([]byte, error)

	// GetURL returns a URL for accessing the object (signed URL if applicable).
	GetURL(ctx context.Context, key string) (string, error)

	// Delete removes an object by key.
	Delete(ctx context.Context, key string) error

	// Exists checks if an object exists at the given key.
	Exists(ctx context.Context, key string) (bool, error)
}
