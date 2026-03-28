/**
 * Document Migrations Service
 *
 * Handles version migrations for PortableDocument format.
 */

import type { PortableDocument } from '../types/document-format'
import { DOCUMENT_FORMAT_VERSION } from '../types/document-format'

// =============================================================================
// Migration Registry
// =============================================================================

type MigrationFunction = (doc: PortableDocument) => PortableDocument

interface MigrationStep {
  toVersion: string
  migrate: MigrationFunction
}

/**
 * Registry of all migrations
 * Key is the source version (version to migrate FROM)
 */
const migrations: Record<string, MigrationStep> = {
  '1.1.0': {
    toVersion: '1.1.1',
    migrate: migrateFrom_1_1_0_to_1_1_1,
  },
  '1.1.1': {
    toVersion: '1.2.0',
    migrate: migrateFrom_1_1_1_to_1_2_0,
  },
}

// =============================================================================
// Migration Functions
// =============================================================================

function migrateFrom_1_1_0_to_1_1_1(doc: PortableDocument): PortableDocument {
  return { ...doc }
}

function migrateFrom_1_1_1_to_1_2_0(doc: PortableDocument): PortableDocument {
  return {
    ...doc,
    header: doc.header
      ? {
          ...doc.header,
          imageInjectableId: doc.header.imageInjectableId ?? null,
          imageInjectableLabel: doc.header.imageInjectableLabel ?? null,
          imageUrl: doc.header.imageUrl ?? null,
          imageWidth: doc.header.imageWidth ?? null,
          imageHeight: doc.header.imageHeight ?? null,
        }
      : doc.header,
  }
}

/**
 * Migrates a document to the current version
 * Applies all necessary migrations in sequence
 */
export function migrateDocument(document: PortableDocument): PortableDocument {
  // If already at current version, no migration needed
  if (document.version === DOCUMENT_FORMAT_VERSION) {
    return document
  }

  let currentDoc = { ...document }

  for (;;) {
    if (currentDoc.version === DOCUMENT_FORMAT_VERSION) {
      return currentDoc
    }

    const step = migrations[currentDoc.version]
    if (!step) {
      throw new Error(`No migration available from version ${currentDoc.version}`)
    }

    currentDoc = step.migrate(currentDoc)
    currentDoc.version = step.toVersion
  }
}

/**
 * Checks if a document needs migration
 */
export function needsMigration(document: PortableDocument): boolean {
  return document.version !== DOCUMENT_FORMAT_VERSION
}

/**
 * Gets a list of available migrations
 */
export function getAvailableMigrations(): string[] {
  return Object.keys(migrations).sort()
}
