import apiClient from './axios';
import type { Customer, CreateCustomerDto, UpdateCustomerDto } from '@/types/customer.types';

export const customersAPI = {
  // 고객사 목록 조회
  getAll: async (): Promise<Customer[]> => {
    const { data } = await apiClient.get('/customers');
    return data;
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
    const { data } = await apiClient.get('/customers/my');
    return data;
  },
};
