import api from './axios';
import type { BackupLog, BackupLogsResponse } from '../types/backup.types';
import { filenameFromContentDisposition, downloadBlob } from '../utils/download';

export const backupApi = {
  runBackup: async (): Promise<BackupLog> => {
    const response = await api.post('/backup/run');
    return response.data;
  },

  getLogs: async (page = 1, limit = 20): Promise<BackupLogsResponse> => {
    const response = await api.get('/backup/logs', { params: { page, limit } });
    return response.data;
  },

  downloadBackup: async (id: number): Promise<void> => {
    const response = await api.get(`/backup/logs/${id}/download`, {
      responseType: 'blob',
    });
    const filename = filenameFromContentDisposition(
      response.headers['content-disposition'],
      `backup_${id}.gz`,
    );
    downloadBlob(response.data, filename);
  },
};
