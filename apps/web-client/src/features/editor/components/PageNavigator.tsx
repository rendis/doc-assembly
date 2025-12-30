import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageNavigatorProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

type DotItem = number | 'ellipsis';

function calculateVisibleDots(current: number, total: number): DotItem[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const dots: DotItem[] = [];
  dots.push(1);

  if (current <= 4) {
    dots.push(2, 3, 4, 5, 'ellipsis', total);
  } else if (current >= total - 3) {
    dots.push('ellipsis', total - 4, total - 3, total - 2, total - 1, total);
  } else {
    dots.push('ellipsis', current - 1, current, current + 1, 'ellipsis', total);
  }

  return dots;
}

export function PageNavigator({ currentPage, totalPages, onPageChange }: PageNavigatorProps) {
  if (totalPages <= 1) return null;

  const visibleDots = calculateVisibleDots(currentPage, totalPages);

  return (
    <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex justify-center z-50">
      <div
        className={cn(
          'pointer-events-auto',
          'flex items-center gap-2 px-2.5 py-1.5',
          'bg-background/95 backdrop-blur-sm',
          'border rounded-full shadow-md',
          'text-xs'
        )}
      >
      {/* Previous */}
      <button
        onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-0.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Anterior"
      >
        <ChevronLeft className="h-3.5 w-3.5" />
      </button>

      {/* Dots */}
      <div className="flex items-center gap-1">
        {visibleDots.map((dot, index) =>
          dot === 'ellipsis' ? (
            <span key={`e-${index}`} className="text-muted-foreground px-0.5">
              ...
            </span>
          ) : (
            <button
              key={dot}
              onClick={() => onPageChange(dot)}
              className={cn(
                'rounded-full transition-all duration-150',
                dot === currentPage
                  ? 'w-2 h-2 bg-primary'
                  : 'w-1.5 h-1.5 bg-muted-foreground/40 hover:bg-muted-foreground/60'
              )}
              aria-label={`Página ${dot}`}
            />
          )
        )}
      </div>

      {/* Page text */}
      <span className="text-muted-foreground tabular-nums">
        {currentPage}/{totalPages}
      </span>

      {/* Next */}
      <button
        onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-0.5 rounded hover:bg-muted disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Siguiente"
      >
        <ChevronRight className="h-3.5 w-3.5" />
      </button>
      </div>
    </div>
  );
}
