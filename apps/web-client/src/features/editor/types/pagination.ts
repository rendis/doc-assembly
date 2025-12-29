export interface PageMargins {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface PageFormat {
  id: string;
  name: string;
  width: number; // in pixels (96 DPI)
  height: number; // in pixels
  margins: PageMargins;
}

export interface PageBoundary {
  pageNumber: number;
  startPos: number; // ProseMirror position of start
  endPos: number; // ProseMirror position of end
  overflow: boolean; // indicates if content exceeds page
}

export interface PaginationState {
  format: PageFormat;
  boundaries: PageBoundary[];
  currentPage: number;
  totalPages: number;
  isCalculating: boolean;
}

export interface PaginationConfig {
  enabled: boolean;
  format: PageFormat;
  showPageNumbers: boolean;
  pageGap: number; // visual gap between pages in pixels
}
