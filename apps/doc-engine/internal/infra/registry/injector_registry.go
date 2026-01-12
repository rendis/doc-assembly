package registry

import (
	"fmt"
	"sync"

	"github.com/doc-assembly/doc-engine/internal/core/port"
	"github.com/doc-assembly/doc-engine/internal/infra/config"
)

// injectorRegistry implements port.injectorRegistry with thread-safe support.
type injectorRegistry struct {
	mu        sync.RWMutex
	injectors map[string]port.Injector
	i18n      *config.InjectorI18nConfig
	initFunc  port.InitFunc
}

// NewInjectorRegistry creates a new InjectorRegistry instance.
func NewInjectorRegistry(i18n *config.InjectorI18nConfig) port.InjectorRegistry {
	return &injectorRegistry{
		injectors: make(map[string]port.Injector),
		i18n:      i18n,
	}
}

// Register registers an injector in the registry.
func (r *injectorRegistry) Register(injector port.Injector) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	code := injector.Code()
	if code == "" {
		return fmt.Errorf("injector code cannot be empty")
	}

	if _, exists := r.injectors[code]; exists {
		return fmt.Errorf("injector with code %q already registered", code)
	}

	r.injectors[code] = injector
	return nil
}

// Get retrieves an injector by its code.
func (r *injectorRegistry) Get(code string) (port.Injector, bool) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	injector, ok := r.injectors[code]
	return injector, ok
}

// GetAll returns all registered injectors.
func (r *injectorRegistry) GetAll() []port.Injector {
	r.mu.RLock()
	defer r.mu.RUnlock()

	result := make([]port.Injector, 0, len(r.injectors))
	for _, injector := range r.injectors {
		result = append(result, injector)
	}
	return result
}

// Codes returns all registered injector codes.
func (r *injectorRegistry) Codes() []string {
	r.mu.RLock()
	defer r.mu.RUnlock()

	codes := make([]string, 0, len(r.injectors))
	for code := range r.injectors {
		codes = append(codes, code)
	}
	return codes
}

// GetName returns the translated name of the injector.
func (r *injectorRegistry) GetName(code, locale string) string {
	if r.i18n == nil {
		return code
	}
	return r.i18n.GetName(code, locale)
}

// GetDescription returns the translated description of the injector.
func (r *injectorRegistry) GetDescription(code, locale string) string {
	if r.i18n == nil {
		return ""
	}
	return r.i18n.GetDescription(code, locale)
}

// SetInitFunc registers the GLOBAL initialization function.
func (r *injectorRegistry) SetInitFunc(fn port.InitFunc) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.initFunc = fn
}

// GetInitFunc returns the registered initialization function.
func (r *injectorRegistry) GetInitFunc() port.InitFunc {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.initFunc
}

// Ensure InjectorRegistry implements port.InjectorRegistry.
var _ port.InjectorRegistry = (*injectorRegistry)(nil)
