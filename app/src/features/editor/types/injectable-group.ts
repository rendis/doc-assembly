import { resolveI18n } from './i18n-resolve'

/**
 * Raw injectable group as returned from the API (with i18n name map).
 */
export interface RawInjectableGroup {
  key: string
  name: Record<string, string>
  icon: string
  order: number
}

/**
 * Injectable group definition for visual organization in the editor panel.
 * Name is already resolved to the current locale.
 */
export interface InjectableGroup {
  /** Unique identifier for the group (e.g., 'datetime', 'tables') */
  key: string
  /** Display name resolved for the current locale */
  name: string
  /** Lucide icon name to display (e.g., 'calendar', 'table') */
  icon: string
  /** Display order (lower numbers appear first) */
  order: number
}

/**
 * Resolve a raw group from the API to a display group with resolved name.
 */
export function resolveGroup(raw: RawInjectableGroup, locale: string): InjectableGroup {
  return {
    key: raw.key,
    name: resolveI18n(raw.name, locale, raw.key),
    icon: raw.icon,
    order: raw.order,
  }
}
