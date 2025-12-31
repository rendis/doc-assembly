/**
 * Document Import Service
 *
 * Imports a portable JSON document into the editor with full state restoration.
 * Variables are resolved against the backend variable list.
 */

// @ts-expect-error - tiptap types incompatible with moduleResolution: bundler
import type { Editor } from '@tiptap/core';
import type {
  PortableDocument,
  ImportResult,
  ImportOptions,
  ValidationResult,
  PageConfig,
  ProseMirrorDocument,
  BackendVariable,
  VariableResolutionResult,
  SignerRoleDefinition,
  SigningWorkflowConfig,
} from '../types/document-format';
import type { PageFormat, PaginationConfig } from '../types/pagination';
import { DOCUMENT_FORMAT_VERSION } from '../types/document-format';
import { validateDocument, isVersionCompatible, compareVersions } from '../schemas/document-schema';
import { validateDocumentSemantics } from './document-validator';
import { migrateDocument } from './document-migrations';
import { PAGE_FORMATS } from '../utils/page-formats';

// =============================================================================
// Types
// =============================================================================

interface ImportStoreActions {
  setPaginationConfig: (config: Partial<PaginationConfig>) => void;
  setSignerRoles: (roles: SignerRoleDefinition[]) => void;
  setWorkflowConfig: (config: SigningWorkflowConfig) => void;
}

// =============================================================================
// Parsing
// =============================================================================

/**
 * Parses JSON string into a PortableDocument
 */
function parseJson(json: string): PortableDocument | null {
  try {
    return JSON.parse(json) as PortableDocument;
  } catch {
    return null;
  }
}

/**
 * Deserializes content from backend to PortableDocument
 * Supports both legacy byte array format and new direct JSON object format
 */
export function deserializeContent(
  content: number[] | Record<string, unknown>
): PortableDocument | null {
  try {
    // New format: direct JSON object
    if (!Array.isArray(content)) {
      return content as unknown as PortableDocument;
    }

    // Legacy format: byte array
    const uint8Array = new Uint8Array(content);
    const jsonString = new TextDecoder().decode(uint8Array);
    return JSON.parse(jsonString) as PortableDocument;
  } catch (error) {
    console.error('Error deserializing content:', error);
    return null;
  }
}

/**
 * @deprecated Use deserializeContent instead
 * Kept for backwards compatibility
 */
export function deserializeContentBytes(bytes: number[]): PortableDocument | null {
  return deserializeContent(bytes);
}

/**
 * Normalizes input to PortableDocument
 */
function normalizeInput(input: string | PortableDocument): PortableDocument | null {
  if (typeof input === 'string') {
    return parseJson(input);
  }
  return input;
}

// =============================================================================
// Variable Resolution
// =============================================================================

/**
 * Resolves variable IDs against the backend variable list
 */
function resolveVariables(
  variableIds: string[],
  backendVariables: BackendVariable[]
): VariableResolutionResult {
  const resolved: BackendVariable[] = [];
  const orphaned: string[] = [];

  for (const id of variableIds) {
    const found = backendVariables.find((v) => v.variableId === id);
    if (found) {
      resolved.push(found);
    } else {
      orphaned.push(id);
    }
  }

  return { resolved, orphaned };
}

// =============================================================================
// Validation
// =============================================================================

/**
 * Validates the document structure and semantics
 * Returns the transformed document from Zod validation
 */
function validateImport(
  document: PortableDocument,
  options: ImportOptions,
  backendVariables: BackendVariable[] = []
): ValidationResult & { transformedDocument?: PortableDocument } {
  // Schema validation (transforms null arrays to empty arrays)
  const schemaResult = validateDocument(document);

  if (!schemaResult.success) {
    return {
      valid: false,
      errors: schemaResult.error.issues.map((issue) => ({
        code: 'SCHEMA_ERROR',
        path: issue.path.join('.'),
        message: issue.message,
      })),
      warnings: [],
    };
  }

  // Use transformed document from Zod (null values are now empty arrays)
  const validatedDoc = schemaResult.data as PortableDocument;

  // Version check
  if (!isVersionCompatible(validatedDoc.version)) {
    const comparison = compareVersions(validatedDoc.version, DOCUMENT_FORMAT_VERSION);

    if (comparison > 0) {
      return {
        valid: false,
        errors: [{
          code: 'VERSION_TOO_NEW',
          path: 'version',
          message: `Versión del documento (${validatedDoc.version}) es más nueva que la soportada (${DOCUMENT_FORMAT_VERSION})`,
        }],
        warnings: [],
      };
    }

    // Older version - will need migration
    if (!options.autoMigrate) {
      return {
        valid: false,
        errors: [{
          code: 'VERSION_MISMATCH',
          path: 'version',
          message: `Versión del documento (${validatedDoc.version}) requiere migración`,
        }],
        warnings: [],
      };
    }
  }

  // Semantic validation
  if (options.validateReferences !== false) {
    const semanticResult = validateDocumentSemantics(validatedDoc, options, backendVariables);
    return { ...semanticResult, transformedDocument: validatedDoc };
  }

  return { valid: true, errors: [], warnings: [], transformedDocument: validatedDoc };
}

// =============================================================================
// State Restoration
// =============================================================================

/**
 * Converts PageConfig back to PageFormat for pagination store
 */
function pageConfigToFormat(pageConfig: PageConfig): PageFormat {
  // Check if it matches a known format
  const knownFormat = PAGE_FORMATS[pageConfig.formatId];

  if (
    knownFormat &&
    knownFormat.width === pageConfig.width &&
    knownFormat.height === pageConfig.height
  ) {
    return {
      ...knownFormat,
      margins: { ...pageConfig.margins },
    };
  }

  // Custom format
  return {
    id: 'CUSTOM',
    name: 'Personalizado',
    width: pageConfig.width,
    height: pageConfig.height,
    margins: { ...pageConfig.margins },
  };
}

/**
 * Restores pagination configuration to store
 */
function restorePageConfig(
  pageConfig: PageConfig,
  actions: ImportStoreActions
): void {
  const format = pageConfigToFormat(pageConfig);

  actions.setPaginationConfig({
    format,
    showPageNumbers: pageConfig.showPageNumbers,
    pageGap: pageConfig.pageGap,
    enabled: true,
  });
}

/**
 * Restores signer roles to store
 */
function restoreSignerRoles(
  signerRoles: SignerRoleDefinition[],
  actions: ImportStoreActions
): void {
  actions.setSignerRoles(signerRoles);
}

/**
 * Restores signing workflow configuration to store
 */
function restoreWorkflowConfig(
  workflowConfig: SigningWorkflowConfig,
  actions: ImportStoreActions
): void {
  actions.setWorkflowConfig(workflowConfig);
}

/**
 * Loads content into the editor
 */
function loadContent(
  editor: Editor,
  content: ProseMirrorDocument
): boolean {
  try {
    editor.commands.setContent({
      type: 'doc',
      content: content.content,
    });
    return true;
  } catch (error) {
    console.error('Error loading content into editor:', error);
    return false;
  }
}

// =============================================================================
// Main Import Functions
// =============================================================================

/**
 * Default import options
 */
const DEFAULT_OPTIONS: ImportOptions = {
  validateReferences: true,
  autoMigrate: true,
  maxImageSize: 5 * 1024 * 1024, // 5MB
};

/**
 * Imports a document into the editor with full state restoration
 * Variables are resolved against the backend variable list
 */
export function importDocument(
  input: string | PortableDocument,
  editor: Editor,
  storeActions: ImportStoreActions,
  backendVariables: BackendVariable[] = [],
  options: ImportOptions = {}
): ImportResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Parse input
  const document = normalizeInput(input);

  if (!document) {
    return {
      success: false,
      validation: {
        valid: false,
        errors: [{
          code: 'PARSE_ERROR',
          path: '',
          message: 'No se pudo parsear el documento JSON',
        }],
        warnings: [],
      },
    };
  }

  // Validate document (also transforms null arrays to empty arrays)
  const validation = validateImport(document, opts, backendVariables);

  if (!validation.valid) {
    return {
      success: false,
      validation,
      document,
    };
  }

  // Use transformed document from validation (null values are now empty arrays)
  const validatedDocument = validation.transformedDocument ?? document;

  // Migrate if needed
  let migratedDocument = validatedDocument;
  if (compareVersions(validatedDocument.version, DOCUMENT_FORMAT_VERSION) < 0) {
    try {
      migratedDocument = migrateDocument(validatedDocument);
    } catch (error) {
      return {
        success: false,
        validation: {
          valid: false,
          errors: [{
            code: 'MIGRATION_ERROR',
            path: 'version',
            message: `Error al migrar documento: ${error instanceof Error ? error.message : 'Unknown error'}`,
          }],
          warnings: [],
        },
        document,
      };
    }
  }

  // Resolve variables against backend
  const variableResolution = resolveVariables(
    migratedDocument.variableIds,
    backendVariables
  );

  // Restore page configuration
  restorePageConfig(migratedDocument.pageConfig, storeActions);

  // Restore signer roles
  restoreSignerRoles(migratedDocument.signerRoles, storeActions);

  // Restore signing workflow configuration
  restoreWorkflowConfig(migratedDocument.signingWorkflow, storeActions);

  // Load content into editor
  const contentLoaded = loadContent(editor, migratedDocument.content);

  if (!contentLoaded) {
    return {
      success: false,
      validation: {
        valid: false,
        errors: [{
          code: 'CONTENT_LOAD_ERROR',
          path: 'content',
          message: 'Error al cargar el contenido en el editor',
        }],
        warnings: validation.warnings,
      },
      document: migratedDocument,
    };
  }

  return {
    success: true,
    validation,
    document: migratedDocument,
    orphanedVariables: variableResolution.orphaned.length > 0
      ? variableResolution.orphaned
      : undefined,
  };
}

/**
 * Validates a document without importing it
 * Variables are validated against the backend variable list
 */
export function validateDocumentForImport(
  input: string | PortableDocument,
  backendVariables: BackendVariable[] = [],
  options: ImportOptions = {}
): ValidationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const document = normalizeInput(input);

  if (!document) {
    return {
      valid: false,
      errors: [{
        code: 'PARSE_ERROR',
        path: '',
        message: 'No se pudo parsear el documento JSON',
      }],
      warnings: [],
    };
  }

  return validateImport(document, opts, backendVariables);
}

/**
 * Reads a file and returns the parsed document
 */
export async function readDocumentFile(file: File): Promise<{
  document: PortableDocument | null;
  error: string | null;
}> {
  if (!file.name.endsWith('.json')) {
    return {
      document: null,
      error: 'El archivo debe tener extensión .json',
    };
  }

  try {
    const text = await file.text();
    const document = parseJson(text);

    if (!document) {
      return {
        document: null,
        error: 'El archivo no contiene JSON válido',
      };
    }

    return { document, error: null };
  } catch (error) {
    return {
      document: null,
      error: `Error al leer el archivo: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

/**
 * Creates a file input and handles file selection
 */
export function openFileDialog(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = window.document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';

    input.onchange = () => {
      const file = input.files?.[0] || null;
      resolve(file);
    };

    input.click();
  });
}

/**
 * Convenience function to open file dialog and import
 * Variables are resolved against the backend variable list
 */
export async function importFromFile(
  editor: Editor,
  storeActions: ImportStoreActions,
  backendVariables: BackendVariable[] = [],
  options: ImportOptions = {}
): Promise<ImportResult | null> {
  const file = await openFileDialog();

  if (!file) {
    return null;
  }

  const { document, error } = await readDocumentFile(file);

  if (error || !document) {
    return {
      success: false,
      validation: {
        valid: false,
        errors: [{
          code: 'FILE_READ_ERROR',
          path: '',
          message: error || 'Error desconocido al leer el archivo',
        }],
        warnings: [],
      },
    };
  }

  return importDocument(document, editor, storeActions, backendVariables, options);
}
