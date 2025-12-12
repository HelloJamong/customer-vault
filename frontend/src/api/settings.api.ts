import api from './axios';
import type {
  SystemSettings,
  UpdateSettingsRequest,
  UpdateSettingsResponse,
} from '../types/settings.types';

export const settingsApi = {
  getSettings: async (): Promise<SystemSettings> => {
    const response = await api.get('/settings');
    return response.data;
  },

  updateSettings: async (
    data: UpdateSettingsRequest,
  ): Promise<UpdateSettingsResponse> => {
    const response = await api.patch('/settings', data);
    return response.data;
  },
};
