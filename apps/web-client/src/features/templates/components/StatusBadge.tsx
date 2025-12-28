import type { VersionStatus } from '../types';
import { useTranslation } from 'react-i18next';

interface StatusBadgeProps {
  status: VersionStatus;
  size?: 'sm' | 'md';
  showDot?: boolean;
}

const statusStyles: Record<VersionStatus, string> = {
  DRAFT: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  PUBLISHED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
  ARCHIVED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
};

const dotStyles: Record<VersionStatus, string> = {
  DRAFT: 'bg-amber-500',
  PUBLISHED: 'bg-emerald-500',
  ARCHIVED: 'bg-slate-400',
};

export function StatusBadge({ status, size = 'sm', showDot = true }: StatusBadgeProps) {
  const { t } = useTranslation();

  const sizeClasses = size === 'sm'
    ? 'px-2 py-0.5 text-xs'
    : 'px-2.5 py-1 text-sm';

  const dotSize = size === 'sm' ? 'w-1.5 h-1.5' : 'w-2 h-2';

  const statusKey = status.toLowerCase() as 'draft' | 'published' | 'archived';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${statusStyles[status]} ${sizeClasses}`}
    >
      {showDot && (
        <span className={`${dotSize} rounded-full ${dotStyles[status]}`} />
      )}
      {t(`templates.status.${statusKey}`)}
    </span>
  );
}
