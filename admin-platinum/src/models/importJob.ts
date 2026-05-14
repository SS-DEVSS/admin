export type ImportJobType = 'products' | 'references' | 'applications';
export type ImportJobStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'stopped';

export interface ImportJobEta {
  estimatedRemainingSeconds: number | null;
  estimatedCompletionAt: string | null;
  rowsPerSecond: number | null;
}

// Error can be a string or an object with category, message, row, etc.
export type ImportJobError = string | {
  category?: string;
  message: string;
  row?: number;
  field?: string;
  value?: string;
};

export interface ImportJob {
  id: string;
  type: ImportJobType;
  status: ImportJobStatus;
  fileName: string;
  categoryId: string | null;
  progress: number;
  totalRows: number;
  processedRows: number;
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: ImportJobError[];
  warnings: ImportJobError[];
  result: Record<string, unknown> | null;
  startedAt: Date | null;
  completedAt: Date | null;
  userId: string | null;
  fileS3Key: string | null;
  originalFileName: string;
  localFilePath: string | null;
  createdAt: Date;
  updatedAt: Date;
  runtime?: {
    lastHeartbeatAt: Date | null;
    secondsSinceHeartbeat: number;
    isStale: boolean;
    staleAfterSeconds: number;
  };
  /** Present when API returns an in-progress estimate (large jobs). */
  eta?: ImportJobEta | null;
}

export interface ImportJobsResponse {
  jobs: ImportJob[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

