import axios from 'axios';

interface ApiErrorPayload {
  message?: string | string[];
}
export function getApiErrorMessage(error: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiErrorPayload>(error)) {
    const message = error.response?.data?.message;
    if (Array.isArray(message)) return message.join(', ');
    if (typeof message === 'string' && message.length > 0) return message;
  }

  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
