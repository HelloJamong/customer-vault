import { useState, useEffect } from 'react';
import axios from 'axios';
import { settingsApi } from '../api/settings.api';
import type {
  SystemSettings,
  UpdateSettingsRequest,
} from '../types/settings.types';
import { getApiErrorMessage } from '@/utils/api-error';

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
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 403) {
        if (err.response.data?.code === 'MFA_SETUP_REQUIRED') {
          setError('OTP 등록을 완료한 뒤 시스템 설정을 이용할 수 있습니다.');
        } else {
          setError('시스템 설정은 최고 관리자(SUPER_ADMIN)만 접근할 수 있습니다.');
        }
      } else {
        setError(getApiErrorMessage(err, '설정을 불러오는데 실패했습니다.'));
      }
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (data: UpdateSettingsRequest) => {
    try {
      setError(null);
      const response = await settingsApi.updateSettings(data);
      // OTP를 활성화한 직후 미등록 관리자의 기존 세션은 MFA 등록 전용으로 제한된다.
      // 이 상태에서 GET /settings를 다시 호출하면 정상적인 MFA_SETUP_REQUIRED 응답이므로
      // 저장 직후에는 재조회하지 않고 호출자가 재로그인 흐름으로 전환한다.
      if (data.otpEnabled !== true || settings?.otpEnabled === true) {
        await fetchSettings();
      }
      return response;
    } catch (err) {
      const errorMessage = getApiErrorMessage(err, '설정 저장에 실패했습니다.');
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
