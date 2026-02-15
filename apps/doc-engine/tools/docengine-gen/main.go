// docengine-gen scans internal/extensions/ looking for structs marked with
// //docengine:injector, //docengine:mapper, //docengine:workspace_provider,
// and //docengine:render_auth, and generates registry_gen.go.
package main

import (
	"bufio"
	"bytes"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"text/template"
)

const (
	extensionsDir           = "internal/extensions"
	injectorsDir            = "internal/extensions/injectors"
	mappersDir              = "internal/extensions/mappers"
	outputFile              = "internal/extensions/registry_gen.go"
	injectorMarker          = "//docengine:injector"
	mapperMarker            = "//docengine:mapper"
	initMarker              = "//docengine:init"
	workspaceProviderMarker = "//docengine:workspace_provider"
	renderAuthMarker        = "//docengine:render_auth"
	modulePrefix            = "github.com/doc-assembly/doc-engine"
)

type discoveredStruct struct {
	Name    string
	Package string
	Import  string
}

type discoveredInit struct {
	FuncName string
	Package  string
	Import   string
}

type generatorData struct {
	Injectors          []discoveredStruct
	Mappers            []discoveredStruct
	WorkspaceProviders []discoveredStruct
	RenderAuths        []discoveredStruct
	InitFuncs          []discoveredInit
	Imports            []string
}

func main() {
	fmt.Println("docengine-gen: Scanning for injectors and mappers...")

	data := &generatorData{}

	// Scan injectors directory
	scanAndValidate(injectorsDir, injectorMarker, "injector", 0, &data.Injectors)

	// Scan mappers directory (singleton)
	scanAndValidate(mappersDir, mapperMarker, "mapper", 1, &data.Mappers)

	// Scan for init function in extensions root
	scanInitAndValidate(extensionsDir, &data.InitFuncs)

	// Scan for workspace provider (singleton)
	scanAndValidate(extensionsDir, workspaceProviderMarker, "workspace provider", 1, &data.WorkspaceProviders)

	// Scan for render authenticator (singleton)
	scanAndValidate(extensionsDir, renderAuthMarker, "render authenticator", 1, &data.RenderAuths)

	// Collect unique imports and generate output
	data.Imports = collectImports(data)

	if err := generateOutput(data); err != nil {
		fmt.Fprintf(os.Stderr, "Error generating output: %v\n", err)
		os.Exit(1)
	}

	fmt.Printf("docengine-gen: Generated %s\n", outputFile)
}

// scanAndValidate scans a directory for a marker, prints results, and enforces maxCount (0 = unlimited).
func scanAndValidate(dir, marker, label string, maxCount int, results *[]discoveredStruct) {
	if err := scanDirectory(dir, marker, results); err != nil {
		fmt.Fprintf(os.Stderr, "Error scanning %ss: %v\n", label, err)
		os.Exit(1)
	}
	fmt.Printf("  Found %d %s(s)\n", len(*results), label)
	if maxCount > 0 && len(*results) > maxCount {
		fmt.Fprintf(os.Stderr, "ERROR: Only ONE %s is allowed. Found %d:\n", label, len(*results))
		for _, s := range *results {
			fmt.Fprintf(os.Stderr, "  - %s.%s\n", s.Package, s.Name)
		}
		fmt.Fprintf(os.Stderr, "Remove extra %s markers.\n", marker)
		os.Exit(1)
	}
}

// scanInitAndValidate scans for init functions and enforces singleton.
func scanInitAndValidate(dir string, results *[]discoveredInit) {
	if err := scanForInit(dir, results); err != nil {
		fmt.Fprintf(os.Stderr, "Error scanning for init: %v\n", err)
		os.Exit(1)
	}
	fmt.Printf("  Found %d init function(s)\n", len(*results))
	if len(*results) > 1 {
		fmt.Fprintf(os.Stderr, "ERROR: Only ONE init function is allowed. Found %d:\n", len(*results))
		for _, i := range *results {
			fmt.Fprintf(os.Stderr, "  - %s.%s\n", i.Package, i.FuncName)
		}
		fmt.Fprintln(os.Stderr, "Remove extra //docengine:init markers.")
		os.Exit(1)
	}
}

// collectImports gathers unique import paths from all discovered components.
func collectImports(data *generatorData) []string {
	imports := make(map[string]bool)
	imports[modulePrefix+"/internal/core/port"] = true
	for _, s := range data.Injectors {
		imports[s.Import] = true
	}
	for _, s := range data.Mappers {
		imports[s.Import] = true
	}
	for _, s := range data.WorkspaceProviders {
		imports[s.Import] = true
	}
	for _, s := range data.RenderAuths {
		imports[s.Import] = true
	}
	sorted := make([]string, 0, len(imports))
	for imp := range imports {
		sorted = append(sorted, imp)
	}
	sort.Strings(sorted)
	return sorted
}

func scanDirectory(dir, marker string, results *[]discoveredStruct) error {
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		return nil // Directory doesn't exist yet, that's OK
	}

	return filepath.WalkDir(dir, func(path string, d os.DirEntry, err error) error {
		if err != nil {
			return err
		}

		if d.IsDir() || !strings.HasSuffix(path, ".go") {
			return nil
		}

		// Skip test files and generated files
		if strings.HasSuffix(path, "_test.go") || strings.HasSuffix(path, "_gen.go") {
			return nil
		}

		structs, err := findMarkedStructs(path, marker)
		if err != nil {
			return fmt.Errorf("parsing %s: %w", path, err)
		}

		*results = append(*results, structs...)
		return nil
	})
}

func findMarkedStructs(filename string, marker string) ([]discoveredStruct, error) {
	var results []discoveredStruct

	// First, find lines with the marker
	markedLines, err := findMarkerLines(filename, marker)
	if err != nil {
		return nil, err
	}

	if len(markedLines) == 0 {
		return nil, nil
	}

	// Parse the file
	fset := token.NewFileSet()
	file, err := parser.ParseFile(fset, filename, nil, parser.ParseComments)
	if err != nil {
		return nil, err
	}

	pkgName := file.Name.Name
	dir := filepath.Dir(filename)
	importPath := modulePrefix + "/" + filepath.ToSlash(dir)

	// Find type declarations on the marked lines
	for _, decl := range file.Decls {
		genDecl, ok := decl.(*ast.GenDecl)
		if !ok || genDecl.Tok != token.TYPE {
			continue
		}

		for _, spec := range genDecl.Specs {
			typeSpec, ok := spec.(*ast.TypeSpec)
			if !ok {
				continue
			}

			// Check if this is a struct
			if _, ok := typeSpec.Type.(*ast.StructType); !ok {
				continue
			}

			// Check if the line before this type has the marker
			pos := fset.Position(typeSpec.Pos())
			if markedLines[pos.Line-1] || markedLines[pos.Line] {
				results = append(results, discoveredStruct{
					Name:    typeSpec.Name.Name,
					Package: pkgName,
					Import:  importPath,
				})
			}
		}
	}

	return results, nil
}

func findMarkerLines(filename, marker string) (map[int]bool, error) {
	file, err := os.Open(filename)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	lines := make(map[int]bool)
	scanner := bufio.NewScanner(file)
	lineNum := 0

	for scanner.Scan() {
		lineNum++
		line := strings.TrimSpace(scanner.Text())
		if strings.HasPrefix(line, marker) {
			lines[lineNum] = true
		}
	}

	return lines, scanner.Err()
}

func scanForInit(dir string, results *[]discoveredInit) error {
	if _, err := os.Stat(dir); os.IsNotExist(err) {
		return nil
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		return err
	}

	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".go") {
			continue
		}

		// Skip test files and generated files
		if strings.HasSuffix(entry.Name(), "_test.go") || strings.HasSuffix(entry.Name(), "_gen.go") {
			continue
		}

		filename := filepath.Join(dir, entry.Name())
		initFuncs, err := findInitFuncs(filename)
		if err != nil {
			return fmt.Errorf("parsing %s: %w", filename, err)
		}

		*results = append(*results, initFuncs...)
	}

	return nil
}

func findInitFuncs(filename string) ([]discoveredInit, error) {
	markedLines, err := findMarkerLines(filename, initMarker)
	if err != nil {
		return nil, err
	}

	if len(markedLines) == 0 {
		return nil, nil
	}

	fset := token.NewFileSet()
	file, err := parser.ParseFile(fset, filename, nil, parser.ParseComments)
	if err != nil {
		return nil, err
	}

	pkgName := file.Name.Name
	dir := filepath.Dir(filename)
	importPath := modulePrefix + "/" + filepath.ToSlash(dir)

	var results []discoveredInit
	for _, decl := range file.Decls {
		funcDecl, ok := decl.(*ast.FuncDecl)
		if !ok || funcDecl.Recv != nil { // Skip methods
			continue
		}

		pos := fset.Position(funcDecl.Pos())
		if markedLines[pos.Line-1] || markedLines[pos.Line] {
			results = append(results, discoveredInit{
				FuncName: funcDecl.Name.Name,
				Package:  pkgName,
				Import:   importPath,
			})
		}
	}

	return results, nil
}

func generateOutput(data *generatorData) error {
	tmpl := template.Must(template.New("registry").Parse(registryTemplate))

	var buf bytes.Buffer
	if err := tmpl.Execute(&buf, data); err != nil {
		return err
	}

	// Ensure output directory exists
	if err := os.MkdirAll(filepath.Dir(outputFile), 0755); err != nil {
		return err
	}

	return os.WriteFile(outputFile, buf.Bytes(), 0600)
}

const registryTemplate = `// Code generated by docengine-gen. DO NOT EDIT.
// Use 'make docengine-gen' to generate the registry.

package extensions

import (
{{- range .Imports }}
	"{{ . }}"
{{- end }}
)

// RegisterAll registers all discovered injectors, mappers, and extension components.
// Note: i18n is automatically loaded from settings/injectors.i18n.yaml
func RegisterAll(injReg port.InjectorRegistry, mapReg port.MapperRegistry, deps *InitDeps) {
{{- if .InitFuncs }}
	// Global init (auto-discovered via //docengine:init)
	injReg.SetInitFunc({{ (index .InitFuncs 0).FuncName }}(deps))
{{- end }}

{{- if .Injectors }}

	// Injectors (auto-discovered via //docengine:injector)
{{- range .Injectors }}
	injReg.Register(&{{ .Package }}.{{ .Name }}{})
{{- end }}
{{- end }}

{{- if .Mappers }}

	// Mapper (auto-discovered via //docengine:mapper)
	// Only ONE mapper is allowed - user handles routing internally
	mapReg.Set(&{{ (index .Mappers 0).Package }}.{{ (index .Mappers 0).Name }}{})
{{- end }}
}
{{- if .WorkspaceProviders }}

// GetWorkspaceProvider returns the discovered workspace injectable provider.
// Auto-discovered via //docengine:workspace_provider (ONE only).
func GetWorkspaceProvider() port.WorkspaceInjectableProvider {
	return &{{ (index .WorkspaceProviders 0).Package }}.{{ (index .WorkspaceProviders 0).Name }}{}
}
{{- end }}
{{- if .RenderAuths }}

// GetRenderAuthenticator returns the discovered render authenticator.
// Auto-discovered via //docengine:render_auth (ONE only).
func GetRenderAuthenticator() port.RenderAuthenticator {
	return &{{ (index .RenderAuths 0).Package }}.{{ (index .RenderAuths 0).Name }}{}
}
{{- end }}
`
