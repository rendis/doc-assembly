package service

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/uuid"

	"github.com/doc-assembly/doc-engine/internal/core/entity"
	"github.com/doc-assembly/doc-engine/internal/core/port"
	"github.com/doc-assembly/doc-engine/internal/core/usecase"
)

// NewTenantService creates a new tenant service.
func NewTenantService(
	tenantRepo port.TenantRepository,
	workspaceRepo port.WorkspaceRepository,
	tenantMemberRepo port.TenantMemberRepository,
) usecase.TenantUseCase {
	return &TenantService{
		tenantRepo:       tenantRepo,
		workspaceRepo:    workspaceRepo,
		tenantMemberRepo: tenantMemberRepo,
	}
}

// TenantService implements tenant business logic.
type TenantService struct {
	tenantRepo       port.TenantRepository
	workspaceRepo    port.WorkspaceRepository
	tenantMemberRepo port.TenantMemberRepository
}

// CreateTenant creates a new tenant with its system workspace.
func (s *TenantService) CreateTenant(ctx context.Context, cmd usecase.CreateTenantCommand) (*entity.Tenant, error) {
	// Check if tenant code already exists
	exists, err := s.tenantRepo.ExistsByCode(ctx, cmd.Code)
	if err != nil {
		return nil, fmt.Errorf("checking tenant code existence: %w", err)
	}
	if exists {
		return nil, entity.ErrTenantAlreadyExists
	}

	tenant := &entity.Tenant{
		ID:          uuid.NewString(),
		Name:        cmd.Name,
		Code:        cmd.Code,
		Description: cmd.Description,
		Settings:    entity.TenantSettings{},
		CreatedAt:   time.Now().UTC(),
	}

	if err := tenant.Validate(); err != nil {
		return nil, fmt.Errorf("validating tenant: %w", err)
	}

	id, err := s.tenantRepo.Create(ctx, tenant)
	if err != nil {
		return nil, fmt.Errorf("creating tenant: %w", err)
	}
	tenant.ID = id

	slog.Info("tenant created",
		slog.String("tenant_id", tenant.ID),
		slog.String("code", tenant.Code),
		slog.String("name", tenant.Name),
	)

	return tenant, nil
}

// GetTenant retrieves a tenant by ID.
func (s *TenantService) GetTenant(ctx context.Context, id string) (*entity.Tenant, error) {
	tenant, err := s.tenantRepo.FindByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("finding tenant %s: %w", id, err)
	}
	return tenant, nil
}

// GetTenantByCode retrieves a tenant by its code.
func (s *TenantService) GetTenantByCode(ctx context.Context, code string) (*entity.Tenant, error) {
	tenant, err := s.tenantRepo.FindByCode(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("finding tenant by code %s: %w", code, err)
	}
	return tenant, nil
}

// ListTenants lists all tenants.
func (s *TenantService) ListTenants(ctx context.Context) ([]*entity.Tenant, error) {
	tenants, err := s.tenantRepo.FindAll(ctx)
	if err != nil {
		return nil, fmt.Errorf("listing tenants: %w", err)
	}
	return tenants, nil
}

// ListUserTenants lists all tenants a user belongs to with their roles.
func (s *TenantService) ListUserTenants(ctx context.Context, userID string) ([]*entity.TenantWithRole, error) {
	tenants, err := s.tenantMemberRepo.FindTenantsWithRoleByUser(ctx, userID)
	if err != nil {
		return nil, fmt.Errorf("listing user tenants: %w", err)
	}
	return tenants, nil
}

// UpdateTenant updates a tenant's details.
func (s *TenantService) UpdateTenant(ctx context.Context, cmd usecase.UpdateTenantCommand) (*entity.Tenant, error) {
	tenant, err := s.tenantRepo.FindByID(ctx, cmd.ID)
	if err != nil {
		return nil, fmt.Errorf("finding tenant: %w", err)
	}

	tenant.Name = cmd.Name
	tenant.Description = cmd.Description

	// Update settings if provided
	if cmd.Settings != nil {
		if currency, ok := cmd.Settings["currency"].(string); ok {
			tenant.Settings.Currency = currency
		}
		if timezone, ok := cmd.Settings["timezone"].(string); ok {
			tenant.Settings.Timezone = timezone
		}
		if dateFormat, ok := cmd.Settings["dateFormat"].(string); ok {
			tenant.Settings.DateFormat = dateFormat
		}
		if locale, ok := cmd.Settings["locale"].(string); ok {
			tenant.Settings.Locale = locale
		}
	}

	now := time.Now().UTC()
	tenant.UpdatedAt = &now

	if err := tenant.Validate(); err != nil {
		return nil, fmt.Errorf("validating tenant: %w", err)
	}

	if err := s.tenantRepo.Update(ctx, tenant); err != nil {
		return nil, fmt.Errorf("updating tenant: %w", err)
	}

	slog.Info("tenant updated",
		slog.String("tenant_id", tenant.ID),
		slog.String("name", tenant.Name),
	)

	return tenant, nil
}

// DeleteTenant deletes a tenant and all its data.
func (s *TenantService) DeleteTenant(ctx context.Context, id string) error {
	// Check if tenant exists
	_, err := s.tenantRepo.FindByID(ctx, id)
	if err != nil {
		return fmt.Errorf("finding tenant: %w", err)
	}

	// Delete tenant (cascade should handle workspaces)
	if err := s.tenantRepo.Delete(ctx, id); err != nil {
		return fmt.Errorf("deleting tenant: %w", err)
	}

	slog.Info("tenant deleted", slog.String("tenant_id", id))
	return nil
}
