package config

import (
	"os"
	"path/filepath"

	"gopkg.in/yaml.v3"
)

// injectorI18n representa la traducción de un inyector.
type injectorI18n struct {
	Name        map[string]string `yaml:"name"`
	Description map[string]string `yaml:"description"`
}

// InjectorI18nConfig contiene todas las traducciones de inyectores.
type InjectorI18nConfig struct {
	entries map[string]injectorI18n
}

// configPaths are the paths to search for config files.
var configPaths = []string{
	"./settings",
	"../settings",
	"../../settings",
	".",
}

// LoadInjectorI18n carga traducciones desde settings/injectors.i18n.yaml.
// Si el archivo no existe, retorna un config vacío (el archivo es opcional).
func LoadInjectorI18n() (*InjectorI18nConfig, error) {
	var data []byte
	var found bool

	// Search for the file in multiple paths
	for _, basePath := range configPaths {
		filePath := filepath.Join(basePath, "injectors.i18n.yaml")
		var err error
		data, err = os.ReadFile(filePath)
		if err == nil {
			found = true
			break
		}
	}

	// If file not found in any path, return empty config
	if !found {
		return &InjectorI18nConfig{entries: make(map[string]injectorI18n)}, nil
	}

	var entries map[string]injectorI18n
	if err := yaml.Unmarshal(data, &entries); err != nil {
		return nil, err
	}

	if entries == nil {
		entries = make(map[string]injectorI18n)
	}

	return &InjectorI18nConfig{entries: entries}, nil
}

// GetName retorna el nombre traducido del inyector.
// Fallback: locale "en" → code si no existe.
func (c *InjectorI18nConfig) GetName(code, locale string) string {
	if c == nil || c.entries == nil {
		return code
	}

	entry, ok := c.entries[code]
	if !ok {
		return code
	}

	// Try requested locale
	if name, ok := entry.Name[locale]; ok {
		return name
	}

	// Fallback to English
	if name, ok := entry.Name["en"]; ok {
		return name
	}

	// Fallback to code
	return code
}

// GetDescription retorna la descripción traducida del inyector.
// Fallback: locale "en" → cadena vacía si no existe.
func (c *InjectorI18nConfig) GetDescription(code, locale string) string {
	if c == nil || c.entries == nil {
		return ""
	}

	entry, ok := c.entries[code]
	if !ok {
		return ""
	}

	// Try requested locale
	if desc, ok := entry.Description[locale]; ok {
		return desc
	}

	// Fallback to English
	if desc, ok := entry.Description["en"]; ok {
		return desc
	}

	return ""
}

// HasEntry verifica si existe una entrada para el code dado.
func (c *InjectorI18nConfig) HasEntry(code string) bool {
	if c == nil || c.entries == nil {
		return false
	}
	_, ok := c.entries[code]
	return ok
}

// Codes retorna todos los codes con traducciones.
func (c *InjectorI18nConfig) Codes() []string {
	if c == nil || c.entries == nil {
		return nil
	}

	codes := make([]string, 0, len(c.entries))
	for code := range c.entries {
		codes = append(codes, code)
	}
	return codes
}
