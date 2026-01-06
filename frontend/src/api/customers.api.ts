import axios, { AxiosError } from 'axios';
import apiClient from './axios';
import type { Customer, CreateCustomerDto, UpdateCustomerDto } from '@/types/customer.types';

interface CustomerFilters {
  search?: string;
  contractType?: string;
  inspectionCycleType?: string;
  version?: string;
  inspectionStatus?: string;
}

export const customersAPI = {
  // 고객사 목록 조회
  getAll: async (filters?: CustomerFilters): Promise<Customer[]> => {
    const params = new URLSearchParams();
    if (filters?.search) params.append('search', filters.search);
    if (filters?.contractType) params.append('contractType', filters.contractType);
    if (filters?.inspectionCycleType) params.append('inspectionCycleType', filters.inspectionCycleType);

    const { data } = await apiClient.get('/customers', { params });

    // 클라이언트 측 필터링 (계산된 값)
    let filtered = data;
    if (filters?.version) {
      filtered = filtered.filter((c: Customer) => c.version === filters.version);
    }
    if (filters?.inspectionStatus) {
      filtered = filtered.filter((c: Customer) => c.inspectionStatus === filters.inspectionStatus);
    }

    return filtered;
  },

  // 고객사 상세 조회
  getById: async (id: number): Promise<Customer> => {
    const { data } = await apiClient.get(`/customers/${id}`);
    return data;
  },

  // 고객사 생성
  create: async (dto: CreateCustomerDto): Promise<Customer> => {
    const { data } = await apiClient.post('/customers', dto);
    return data;
  },

  // 고객사 수정
  update: async (id: number, dto: UpdateCustomerDto): Promise<Customer> => {
    const { data } = await apiClient.patch(`/customers/${id}`, dto);
    return data;
  },

  // 고객사 삭제
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/customers/${id}`);
  },

  // 담당 고객사 목록 (일반 사용자용)
  getMyCustomers: async (): Promise<Customer[]> => {
    try {
      const { data } = await apiClient.get('/customers/my');
      return data;
    } catch (error) {
      // 백엔드가 400을 반환하더라도 담당 고객사가 없는 것으로 간주
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError;
        if (axiosError.response?.status === 400) {
          return [];
        }
      }
      throw error;
    }
  },
};
