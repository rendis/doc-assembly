/**
 * Document Version Migrations
 *
 * Handles upgrading documents from older format versions to the current version.
 */

import type { PortableDocument } from '../types/document-format';
import { DOCUMENT_FORMAT_VERSION } from '../types/document-format';
import { createDefaultWorkflowConfig } from '../types/signer-roles';
import { compareVersions } from '../schemas/document-schema';

// =============================================================================
// Types
// =============================================================================

/**
 * A migration function that transforms a document from one version to another
 */
type Migration = (document: PortableDocument) => PortableDocument;

/**
 * Migration registry entry
 */
interface MigrationEntry {
  fromVersion: string;
  toVersion: string;
  migrate: Migration;
}

// =============================================================================
// Migration Registry
// =============================================================================

/**
 * Registry of all migrations.
 * Each migration upgrades from one version to the next.
 * Migrations are applied sequentially.
 */
const migrations: MigrationEntry[] = [
  // Migration 1.0.0 → 1.1.0: Add signingWorkflow configuration
  {
    fromVersion: '1.0.0',
    toVersion: '1.1.0',
    migrate: (doc) => {
      return {
        ...doc,
        version: '1.1.0',
        signingWorkflow: createDefaultWorkflowConfig(),
      };
    },
  },
];

// =============================================================================
// Migration Helpers
// =============================================================================

/**
 * Gets the sequence of migrations needed to upgrade from one version to another
 */
function getMigrationPath(fromVersion: string, toVersion: string): Migration[] {
  const path: Migration[] = [];
  let currentVersion = fromVersion;

  while (compareVersions(currentVersion, toVersion) < 0) {
    const migration = migrations.find((m) => m.fromVersion === currentVersion);

    if (!migration) {
      // No direct migration found, try to find any migration from current version
      const anyMigration = migrations.find(
        (m) =>
          compareVersions(m.fromVersion, currentVersion) >= 0 &&
          compareVersions(m.toVersion, toVersion) <= 0
      );

      if (!anyMigration) {
        throw new Error(
          `No migration path found from ${currentVersion} to ${toVersion}`
        );
      }

      path.push(anyMigration.migrate);
      currentVersion = anyMigration.toVersion;
    } else {
      path.push(migration.migrate);
      currentVersion = migration.toVersion;
    }
  }

  return path;
}

/**
 * Validates that the version string is in semver format
 */
function isValidVersion(version: string): boolean {
  return /^\d+\.\d+\.\d+$/.test(version);
}

// =============================================================================
// Main Migration Function
// =============================================================================

/**
 * Migrates a document to the current format version
 *
 * @param document - The document to migrate
 * @returns The migrated document with updated version
 * @throws Error if migration fails or no migration path exists
 */
export function migrateDocument(document: PortableDocument): PortableDocument {
  const { version } = document;

  // Validate version format
  if (!isValidVersion(version)) {
    throw new Error(`Invalid version format: ${version}`);
  }

  // Check if already at current version
  if (compareVersions(version, DOCUMENT_FORMAT_VERSION) === 0) {
    return document;
  }

  // Check if document is newer than current (shouldn't happen normally)
  if (compareVersions(version, DOCUMENT_FORMAT_VERSION) > 0) {
    throw new Error(
      `Document version ${version} is newer than current version ${DOCUMENT_FORMAT_VERSION}`
    );
  }

  // Get migration path
  const migrationPath = getMigrationPath(version, DOCUMENT_FORMAT_VERSION);

  // Apply migrations sequentially
  let migratedDocument = document;
  for (const migration of migrationPath) {
    migratedDocument = migration(migratedDocument);
  }

  // Ensure version is updated to current
  return {
    ...migratedDocument,
    version: DOCUMENT_FORMAT_VERSION,
  };
}

/**
 * Checks if a document needs migration
 */
export function needsMigration(document: PortableDocument): boolean {
  return compareVersions(document.version, DOCUMENT_FORMAT_VERSION) < 0;
}

/**
 * Gets information about required migrations for a document
 */
export function getMigrationInfo(document: PortableDocument): {
  needsMigration: boolean;
  fromVersion: string;
  toVersion: string;
  migrationCount: number;
} {
  const needs = needsMigration(document);

  if (!needs) {
    return {
      needsMigration: false,
      fromVersion: document.version,
      toVersion: DOCUMENT_FORMAT_VERSION,
      migrationCount: 0,
    };
  }

  try {
    const path = getMigrationPath(document.version, DOCUMENT_FORMAT_VERSION);
    return {
      needsMigration: true,
      fromVersion: document.version,
      toVersion: DOCUMENT_FORMAT_VERSION,
      migrationCount: path.length,
    };
  } catch {
    return {
      needsMigration: true,
      fromVersion: document.version,
      toVersion: DOCUMENT_FORMAT_VERSION,
      migrationCount: -1, // Indicates unknown/error
    };
  }
}

// =============================================================================
// Migration Registration (for future use)
// =============================================================================

/**
 * Registers a new migration
 * This is useful for plugins or extensions that need to add migrations
 */
export function registerMigration(entry: MigrationEntry): void {
  // Validate versions
  if (!isValidVersion(entry.fromVersion) || !isValidVersion(entry.toVersion)) {
    throw new Error('Invalid version format in migration entry');
  }

  // Check for duplicates
  const exists = migrations.some(
    (m) =>
      m.fromVersion === entry.fromVersion && m.toVersion === entry.toVersion
  );

  if (exists) {
    throw new Error(
      `Migration from ${entry.fromVersion} to ${entry.toVersion} already exists`
    );
  }

  migrations.push(entry);
}

/**
 * Gets the current list of registered migrations (for debugging)
 */
export function getRegisteredMigrations(): ReadonlyArray<{
  fromVersion: string;
  toVersion: string;
}> {
  return migrations.map(({ fromVersion, toVersion }) => ({
    fromVersion,
    toVersion,
  }));
}
