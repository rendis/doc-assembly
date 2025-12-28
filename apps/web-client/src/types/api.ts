export interface ApiResponse<T> {
  data: T;
  // Add meta/pagination if standard wrapped
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
}

export interface ApiError {
  message: string;
  code?: string;
  errors?: Record<string, string[]>;
}
