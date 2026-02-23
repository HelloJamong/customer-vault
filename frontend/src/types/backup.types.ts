export interface BackupLog {
  id: number;
  status: 'success' | 'failed' | 'running';
  type: 'auto' | 'manual';
  targets: string; // 'db', 'docs', 'db,docs'
  destinations: string; // 'local', 'remote', 'local,remote'
  filePath: string | null;
  fileSize: string | null; // BigInt → string
  errorMessage: string | null;
  startedAt: string;
  completedAt: string | null;
  createdBy: number | null;
  creator?: {
    id: number;
    name: string;
    username: string;
  } | null;
}

export interface BackupLogsResponse {
  data: BackupLog[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
