// 기본값을 상대경로로 두어 리버스 프록시/도커 환경에서 공통으로 동작하도록 설정
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';
export const ACCESS_TOKEN_KEY = import.meta.env.VITE_ACCESS_TOKEN_KEY || 'access_token';
export const REFRESH_TOKEN_KEY = import.meta.env.VITE_REFRESH_TOKEN_KEY || 'refresh_token';
