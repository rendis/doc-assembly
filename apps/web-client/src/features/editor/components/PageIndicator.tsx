import { cn } from '@/lib/utils';

interface PageIndicatorProps {
  currentPage: number;
  totalPages: number;
  showPageNumbers: boolean;
  className?: string;
}

export const PageIndicator = ({
  currentPage,
  totalPages,
  showPageNumbers,
  className,
}: PageIndicatorProps) => {
  if (!showPageNumbers) return null;

  return (
    <div
      className={cn(
        'page-indicator',
        'fixed top-4 right-4 z-50',
        'px-3 py-1.5 rounded-md',
        'bg-muted/80 backdrop-blur-sm',
        'border border-border',
        'text-xs font-medium text-muted-foreground',
        'shadow-sm',
        'print:hidden',
        className
      )}
    >
      {currentPage} / {totalPages}
    </div>
  );
};
