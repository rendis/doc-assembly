package port

import "context"

// StorageAdapter defines the interface for object storage services.
type StorageAdapter interface {
	// Download retrieves data by key.
	Download(ctx context.Context, key string) ([]byte, error)
}
