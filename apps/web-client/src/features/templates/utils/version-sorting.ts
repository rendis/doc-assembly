import type { TemplateVersion } from '../types';

export type VersionSortOption =
  | 'version-desc'   // Versión (Más reciente) - DEFAULT
  | 'version-asc'    // Versión (Más antigua)
  | 'modified-desc'  // Última modificación (Reciente)
  | 'modified-asc';  // Última modificación (Antigua)

/**
 * Sorts template versions based on the selected sort option
 * @param versions - Array of template versions to sort
 * @param sortBy - Sort option to apply
 * @returns Sorted array of template versions (new array, doesn't mutate original)
 */
export function sortVersions(
  versions: TemplateVersion[],
  sortBy: VersionSortOption
): TemplateVersion[] {
  const sorted = [...versions]; // Create copy to avoid mutation

  switch (sortBy) {
    case 'version-desc':
      return sorted.sort((a, b) => b.versionNumber - a.versionNumber);

    case 'version-asc':
      return sorted.sort((a, b) => a.versionNumber - b.versionNumber);

    case 'modified-desc':
      return sorted.sort((a, b) => {
        const dateA = a.updatedAt || a.createdAt;
        const dateB = b.updatedAt || b.createdAt;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });

    case 'modified-asc':
      return sorted.sort((a, b) => {
        const dateA = a.updatedAt || a.createdAt;
        const dateB = b.updatedAt || b.createdAt;
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      });

    default:
      return sorted;
  }
}
