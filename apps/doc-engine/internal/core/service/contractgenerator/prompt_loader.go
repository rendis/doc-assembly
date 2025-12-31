// Package contractgenerator provides contract generation services using LLM.
package contractgenerator

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"sync"

	"github.com/doc-assembly/doc-engine/internal/core/usecase"
)

// PromptLoader handles loading and processing prompt templates.
type PromptLoader struct {
	promptFile         string
	markdownPromptFile string
	template           string
	markdownTemplate   string
	once               sync.Once
	markdownOnce       sync.Once
	loadErr            error
	markdownLoadErr    error
}

// NewPromptLoader creates a new prompt loader for the given file.
func NewPromptLoader(promptFile string) *PromptLoader {
	return &PromptLoader{
		promptFile:         promptFile,
		markdownPromptFile: "contract_to_markdown_prompt.txt",
	}
}

// LoadWithLang loads the prompt template and replaces the language placeholder.
func (pl *PromptLoader) LoadWithLang(lang string) (string, error) {
	return pl.LoadWithLangAndInjectables(lang, nil)
}

// LoadWithLangAndInjectables loads the prompt template and replaces language and injectables placeholders.
func (pl *PromptLoader) LoadWithLangAndInjectables(lang string, injectables []usecase.InjectableInfo) (string, error) {
	pl.once.Do(func() {
		pl.template, pl.loadErr = pl.loadTemplate()
	})

	if pl.loadErr != nil {
		return "", pl.loadErr
	}

	// Replace language placeholder
	result := strings.ReplaceAll(pl.template, "{{OUTPUT_LANG}}", mapLangName(lang))

	// Replace injectables placeholder
	injectablesList := buildInjectablesList(injectables)
	result = strings.ReplaceAll(result, "{{AVAILABLE_INJECTABLES}}", injectablesList)

	return result, nil
}

// mapLangName converts a language code to a human-readable language name.
func mapLangName(lang string) string {
	switch lang {
	case "es":
		return "Spanish (Español)"
	case "en":
		return "English"
	default:
		return lang
	}
}

// buildInjectablesList builds a formatted list of available injectables for the prompt.
func buildInjectablesList(injectables []usecase.InjectableInfo) string {
	if len(injectables) == 0 {
		return `No injectables are available in the workspace.
Transcribe ALL content as plain text and mark detected placeholders/blank spaces with double brackets: [[placeholder description]]
Example: "El cliente ______ acepta..." → "El cliente [[nombre del cliente]] acepta..."
DO NOT create injector nodes - only use text nodes with the [[...]] markers.`
	}

	var sb strings.Builder
	sb.WriteString("The following injectables are available in the workspace:\n\n")
	sb.WriteString("| Key | Label | Data Type |\n")
	sb.WriteString("|-----|-------|----------|\n")

	for _, inj := range injectables {
		sb.WriteString(fmt.Sprintf("| `%s` | %s | %s |\n", inj.Key, inj.Label, inj.DataType))
	}

	sb.WriteString("\n**IMPORTANT**: You can ONLY use injectable keys from this list above. Do NOT invent or create new injectable IDs.")

	return sb.String()
}

// LoadMarkdownPrompt loads the markdown conversion prompt template.
// It replaces the language, extracted text, and injectables placeholders.
func (pl *PromptLoader) LoadMarkdownPrompt(lang string, extractedText string, injectables []usecase.InjectableInfo) (string, error) {
	pl.markdownOnce.Do(func() {
		pl.markdownTemplate, pl.markdownLoadErr = pl.loadTemplateByName(pl.markdownPromptFile)
	})

	if pl.markdownLoadErr != nil {
		return "", pl.markdownLoadErr
	}

	// Replace language placeholder
	result := strings.ReplaceAll(pl.markdownTemplate, "{{OUTPUT_LANG}}", mapLangName(lang))

	// Replace extracted text placeholder
	result = strings.ReplaceAll(result, "{{EXTRACTED_TEXT}}", extractedText)

	// Replace injectables placeholder
	injectablesList := buildInjectablesListForMarkdown(injectables)
	result = strings.ReplaceAll(result, "{{AVAILABLE_INJECTABLES}}", injectablesList)

	return result, nil
}

// buildInjectablesListForMarkdown builds a formatted list of available injectables for the markdown prompt.
func buildInjectablesListForMarkdown(injectables []usecase.InjectableInfo) string {
	if len(injectables) == 0 {
		return `No injectables are currently defined in the workspace.
For ANY placeholder or blank space you detect, use a descriptive suggestion:
[[ descriptive_name_here ]]

Examples:
- "Nombre: ____" → [[ nombre_cliente ]]
- "Fecha: __/__/____" → [[ fecha_contrato ]]
- "Monto: $____" → [[ monto_total ]]`
	}

	var sb strings.Builder
	sb.WriteString("The following injectables are available. Use these EXACT keys when you detect matching placeholders:\n\n")
	sb.WriteString("| Key | Label | Data Type |\n")
	sb.WriteString("|-----|-------|----------|\n")

	for _, inj := range injectables {
		sb.WriteString(fmt.Sprintf("| `%s` | %s | %s |\n", inj.Key, inj.Label, inj.DataType))
	}

	sb.WriteString("\nFor placeholders that don't match any key above, use a descriptive suggestion like `[[ suggested_name ]]`")

	return sb.String()
}

// loadTemplate reads the prompt template from the file system.
func (pl *PromptLoader) loadTemplate() (string, error) {
	return pl.loadTemplateByName(pl.promptFile)
}

// loadTemplateByName reads a prompt template by name from the file system.
func (pl *PromptLoader) loadTemplateByName(fileName string) (string, error) {
	// Search paths in order of priority
	searchPaths := []string{
		filepath.Join("./settings", fileName),
		filepath.Join("../settings", fileName),
		filepath.Join("../../settings", fileName),
		fileName,
	}

	for _, path := range searchPaths {
		content, err := os.ReadFile(path)
		if err == nil {
			return string(content), nil
		}
	}

	return "", fmt.Errorf("prompt file not found: %s (searched in settings directories)", fileName)
}
