import type { VersionStatus } from '../types';
import { useTranslation } from 'react-i18next';

interface StatusBadgeProps {
  status: VersionStatus;
  size?: 'sm' | 'md';
  showDot?: boolean;
}

const statusStyles: Record<VersionStatus, string> = {
  DRAFT: 'bg-warning-muted text-warning-foreground',
  PUBLISHED: 'bg-success-muted text-success-foreground',
  ARCHIVED: 'bg-muted text-muted-foreground',
};

const dotStyles: Record<VersionStatus, string> = {
  DRAFT: 'bg-warning',
  PUBLISHED: 'bg-success',
  ARCHIVED: 'bg-muted-foreground',
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
