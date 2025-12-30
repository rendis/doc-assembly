/**
 * Formats a date string to a relative time string (e.g., "2 days ago" or "hace 2 días")
 * @param dateString - ISO date string
 * @param locale - Optional locale (defaults to browser locale)
 */
export function formatDistanceToNow(dateString: string, locale?: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  // Get current locale from browser if not provided
  const currentLocale = locale || navigator.language || 'en';
  const isSpanish = currentLocale.startsWith('es');

  if (diffInSeconds < 60) {
    return isSpanish ? 'ahora mismo' : 'just now';
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return isSpanish ? `hace ${diffInMinutes}m` : `${diffInMinutes}m ago`;
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return isSpanish ? `hace ${diffInHours}h` : `${diffInHours}h ago`;
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return isSpanish ? `hace ${diffInDays}d` : `${diffInDays}d ago`;
  }

  const diffInWeeks = Math.floor(diffInDays / 7);
  if (diffInWeeks < 4) {
    return isSpanish ? `hace ${diffInWeeks}sem` : `${diffInWeeks}w ago`;
  }

  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) {
    return isSpanish ? `hace ${diffInMonths}mes` : `${diffInMonths}mo ago`;
  }

  const diffInYears = Math.floor(diffInDays / 365);
  return isSpanish ? `hace ${diffInYears}a` : `${diffInYears}y ago`;
}

/**
 * Formats a date string to a localized date string
 */
export function formatDate(dateString: string, options?: Intl.DateTimeFormatOptions): string {
  const date = new Date(dateString);
  return date.toLocaleDateString(undefined, options ?? {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formats a date string to a localized date and time string
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
