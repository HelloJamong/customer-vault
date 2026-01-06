import apiClient from './axios';
import type { MissingInspectionsResponse } from '../types/inspection-status.types';

export const inspectionStatusApi = {
  getMissingInspections: async (year?: number): Promise<MissingInspectionsResponse> => {
    const response = await apiClient.get<MissingInspectionsResponse>(
      '/inspection-status/missing',
      {
        params: { year },
      },
    );
    return response.data;
  },
};
