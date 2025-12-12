import { useState, useEffect } from 'react';
import { settingsApi } from '../api/settings.api';
import type {
  SystemSettings,
  UpdateSettingsRequest,
} from '../types/settings.types';

export const useSettings = () => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await settingsApi.getSettings();
      setSettings(data);
    } catch (err: any) {
      if (err.response?.status === 403) {
        setError('시스템 설정은 최고 관리자(SUPER_ADMIN)만 접근할 수 있습니다.');
      } else {
        setError(err.response?.data?.message || '설정을 불러오는데 실패했습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (data: UpdateSettingsRequest) => {
    try {
      setError(null);
      const response = await settingsApi.updateSettings(data);
      await fetchSettings();
      return response;
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.message || '설정 저장에 실패했습니다.';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    loading,
    error,
    fetchSettings,
    updateSettings,
  };
};
