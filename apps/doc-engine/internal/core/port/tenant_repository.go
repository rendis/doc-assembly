package port

import (
	"context"

	"github.com/doc-assembly/doc-engine/internal/core/entity"
)

// TenantRepository defines the interface for tenant data access.
type TenantRepository interface {
	// Create creates a new tenant.
	Create(ctx context.Context, tenant *entity.Tenant) (string, error)

	// FindByID finds a tenant by ID.
	FindByID(ctx context.Context, id string) (*entity.Tenant, error)

	// FindByCode finds a tenant by code.
	FindByCode(ctx context.Context, code string) (*entity.Tenant, error)

	// FindAll lists all tenants.
	FindAll(ctx context.Context) ([]*entity.Tenant, error)

	// Update updates a tenant.
	Update(ctx context.Context, tenant *entity.Tenant) error

	// Delete deletes a tenant.
	Delete(ctx context.Context, id string) error

	// ExistsByCode checks if a tenant with the given code exists.
	ExistsByCode(ctx context.Context, code string) (bool, error)
}
