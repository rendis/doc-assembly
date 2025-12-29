import type { ReactNode } from 'react';
import type { PageFormat } from '../types/pagination';

interface PagesViewportProps {
  children: ReactNode;
  format: PageFormat;
  pageGap: number;
  showPageNumbers: boolean;
  currentPage: number;
  totalPages: number;
}

export const PagesViewport = ({
  children,
  format,
  pageGap,
  showPageNumbers,
  currentPage,
  totalPages,
}: PagesViewportProps) => {
  // Calculate content area height (page height minus margins)
  const contentHeight = format.height - format.margins.top - format.margins.bottom;

  return (
    <div
      className="pages-viewport flex-1 overflow-y-auto bg-muted/20 p-8"
      style={
        {
          '--page-width': `${format.width}px`,
          '--page-height': `${format.height}px`,
          '--page-gap': `${pageGap}px`,
          '--margin-top': `${format.margins.top}px`,
          '--margin-bottom': `${format.margins.bottom}px`,
          '--margin-left': `${format.margins.left}px`,
          '--margin-right': `${format.margins.right}px`,
          '--content-height': `${contentHeight}px`,
        } as React.CSSProperties
      }
    >
      <div className="pages-container mx-auto" style={{ width: format.width }}>
        {/* Page wrapper with visual page styling */}
        <div
          className="page-wrapper bg-card shadow-md relative"
          style={{
            width: format.width,
            minHeight: format.height,
            paddingLeft: 0,
            paddingRight: 0,
          }}
        >
          {/* Content container fills the content area */}
          <div className="page-content relative" style={{ height: contentHeight }}>
            {children}
          </div>
        </div>

        {/* Page indicator at bottom */}
        {showPageNumbers && (
          <div className="flex items-center justify-center gap-2 py-3 text-xs text-muted-foreground">
            <span>
              Página {currentPage} de {totalPages}
            </span>
            <span className="text-muted-foreground/50">|</span>
            <span>
              {format.name} ({format.width} x {format.height} px)
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
