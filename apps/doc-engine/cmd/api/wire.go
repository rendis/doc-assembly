//go:build wireinject
// +build wireinject

package main

import (
	"github.com/google/wire"

	"github.com/doc-assembly/doc-engine/internal/infra"
)

// InitializeApp creates the application with all dependencies wired.
func InitializeApp() (*infra.Initializer, error) {
	wire.Build(infra.ProviderSet)
	return nil, nil
}
