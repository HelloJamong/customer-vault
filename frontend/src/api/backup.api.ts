import api from './axios';
import type { BackupLog, BackupLogsResponse } from '../types/backup.types';

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
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const contentDisposition = response.headers['content-disposition'];
    let filename = `backup_${id}.gz`;
    if (contentDisposition) {
      const match = contentDisposition.match(/filename[^;=\n]*=([^;\n]*)/);
      if (match) filename = match[1].trim().replace(/['"]/g, '');
    }
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },
};
