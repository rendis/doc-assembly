package s3

import (
	"context"
	"errors"
	"fmt"
	"io"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/s3"

	"github.com/doc-assembly/signing-worker/internal/port"
)

// Config holds the S3 adapter configuration.
type Config struct {
	Bucket   string
	Region   string
	Endpoint string // For S3-compatible services (MinIO, LocalStack)
}

// Adapter implements port.StorageAdapter for AWS S3 and compatible services.
type Adapter struct {
	client *s3.Client
	bucket string
}

// New creates a new S3 storage adapter.
func New(cfg *Config) (port.StorageAdapter, error) {
	if cfg.Bucket == "" {
		return nil, errors.New("s3: bucket is required")
	}

	awsCfg, err := config.LoadDefaultConfig(context.Background(),
		config.WithRegion(cfg.Region),
	)
	if err != nil {
		return nil, fmt.Errorf("s3: loading aws config: %w", err)
	}

	var clientOpts []func(*s3.Options)

	// Custom endpoint for S3-compatible services (MinIO, LocalStack)
	if cfg.Endpoint != "" {
		clientOpts = append(clientOpts, func(o *s3.Options) {
			o.BaseEndpoint = aws.String(cfg.Endpoint)
			o.UsePathStyle = true
		})
	}

	client := s3.NewFromConfig(awsCfg, clientOpts...)

	return &Adapter{
		client: client,
		bucket: cfg.Bucket,
	}, nil
}

// Download retrieves data by key.
func (a *Adapter) Download(ctx context.Context, key string) ([]byte, error) {
	input := &s3.GetObjectInput{
		Bucket: aws.String(a.bucket),
		Key:    aws.String(key),
	}

	result, err := a.client.GetObject(ctx, input)
	if err != nil {
		return nil, fmt.Errorf("s3: getting object: %w", err)
	}
	defer result.Body.Close()

	data, err := io.ReadAll(result.Body)
	if err != nil {
		return nil, fmt.Errorf("s3: reading object body: %w", err)
	}

	return data, nil
}
