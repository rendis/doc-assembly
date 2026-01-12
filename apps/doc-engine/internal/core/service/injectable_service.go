package service

import (
	"context"
	"fmt"
	"time"

	"github.com/doc-assembly/doc-engine/internal/core/entity"
	"github.com/doc-assembly/doc-engine/internal/core/port"
	"github.com/doc-assembly/doc-engine/internal/core/usecase"
)

// NewInjectableService creates a new injectable service.
func NewInjectableService(
	injectableRepo port.InjectableRepository,
	injectorRegistry port.InjectorRegistry,
) usecase.InjectableUseCase {
	return &InjectableService{
		injectableRepo:   injectableRepo,
		injectorRegistry: injectorRegistry,
	}
}

// InjectableService implements injectable definition business logic.
// Note: Injectables are read-only - they are managed via database migrations/seeds.
type InjectableService struct {
	injectableRepo   port.InjectableRepository
	injectorRegistry port.InjectorRegistry
}

// GetInjectable retrieves an injectable definition by ID.
func (s *InjectableService) GetInjectable(ctx context.Context, id string) (*entity.InjectableDefinition, error) {
	injectable, err := s.injectableRepo.FindByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("finding injectable %s: %w", id, err)
	}
	return injectable, nil
}

// ListInjectables lists all injectable definitions for a workspace (including global + extensions).
func (s *InjectableService) ListInjectables(ctx context.Context, workspaceID string) ([]*entity.InjectableDefinition, error) {
	dbInjectables, err := s.injectableRepo.FindByWorkspace(ctx, workspaceID)
	if err != nil {
		return nil, fmt.Errorf("listing injectables: %w", err)
	}

	extInjectables := s.getExtensionInjectables()
	return s.mergeInjectables(dbInjectables, extInjectables), nil
}

// ListGlobalInjectables lists all global injectable definitions (including extensions).
func (s *InjectableService) ListGlobalInjectables(ctx context.Context) ([]*entity.InjectableDefinition, error) {
	dbInjectables, err := s.injectableRepo.FindGlobal(ctx)
	if err != nil {
		return nil, fmt.Errorf("listing global injectables: %w", err)
	}

	extInjectables := s.getExtensionInjectables()
	return s.mergeInjectables(dbInjectables, extInjectables), nil
}

// FindByKey finds an injectable by key.
func (s *InjectableService) FindByKey(ctx context.Context, workspaceID *string, key string) (*entity.InjectableDefinition, error) {
	injectable, err := s.injectableRepo.FindByKey(ctx, workspaceID, key)
	if err != nil {
		return nil, fmt.Errorf("finding injectable by key: %w", err)
	}
	return injectable, nil
}

// getExtensionInjectables converts all registered injectors to InjectableDefinition.
func (s *InjectableService) getExtensionInjectables() []*entity.InjectableDefinition {
	if s.injectorRegistry == nil {
		return nil
	}

	injectors := s.injectorRegistry.GetAll()
	result := make([]*entity.InjectableDefinition, 0, len(injectors))

	for _, inj := range injectors {
		result = append(result, s.injectorToDefinition(inj))
	}
	return result
}

// injectorToDefinition converts a port.Injector to entity.InjectableDefinition.
func (s *InjectableService) injectorToDefinition(inj port.Injector) *entity.InjectableDefinition {
	code := inj.Code()

	// Get translations (default to "es" locale, fallback to code)
	label := s.injectorRegistry.GetName(code, "es")
	description := s.injectorRegistry.GetDescription(code, "es")

	// Convert DataType
	dataType := s.convertDataType(inj.DataType())

	// Convert FormatConfig
	var formatConfig *entity.FormatConfig
	if formats := inj.Formats(); formats != nil {
		formatConfig = &entity.FormatConfig{
			Default: formats.Default,
			Options: formats.Options,
		}
	}

	// Convert DefaultValue
	var defaultValue *string
	if defVal := inj.DefaultValue(); defVal != nil {
		if str, ok := defVal.String(); ok {
			defaultValue = &str
		}
	}

	return &entity.InjectableDefinition{
		ID:           code, // Same as key
		WorkspaceID:  nil,  // Global (extension injectors are system-wide)
		Key:          code,
		Label:        label,
		Description:  description,
		DataType:     dataType,
		SourceType:   entity.InjectableSourceTypeExternal, // Extensions are EXTERNAL
		Metadata:     nil,
		FormatConfig: formatConfig,
		DefaultValue: defaultValue,
		IsActive:     true,
		IsDeleted:    false,
		CreatedAt:    time.Time{}, // Extensions don't have creation time
		UpdatedAt:    nil,
	}
}

// convertDataType converts entity.ValueType to entity.InjectableDataType.
func (s *InjectableService) convertDataType(vt entity.ValueType) entity.InjectableDataType {
	switch vt {
	case entity.ValueTypeString:
		return entity.InjectableDataTypeText
	case entity.ValueTypeNumber:
		return entity.InjectableDataTypeNumber
	case entity.ValueTypeBool:
		return entity.InjectableDataTypeBoolean
	case entity.ValueTypeTime:
		return entity.InjectableDataTypeDate
	default:
		return entity.InjectableDataTypeText
	}
}

// mergeInjectables merges DB and extension injectables.
// DB injectables take priority (can override extension keys).
func (s *InjectableService) mergeInjectables(db, ext []*entity.InjectableDefinition) []*entity.InjectableDefinition {
	// Build set of DB keys
	dbKeys := make(map[string]bool)
	for _, inj := range db {
		dbKeys[inj.Key] = true
	}

	// Start with DB injectables
	result := make([]*entity.InjectableDefinition, 0, len(db)+len(ext))
	result = append(result, db...)

	// Add extension injectables that don't conflict with DB keys
	for _, inj := range ext {
		if !dbKeys[inj.Key] {
			result = append(result, inj)
		}
	}

	return result
}
