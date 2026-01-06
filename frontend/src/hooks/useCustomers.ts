import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersAPI } from '@/api/customers.api';
import type { CreateCustomerDto, UpdateCustomerDto } from '@/types/customer.types';

interface CustomerFilters {
  search?: string;
  contractType?: string;
  inspectionCycleType?: string;
  version?: string;
  inspectionStatus?: string;
}

export const useCustomers = (filters?: CustomerFilters) => {
  const queryClient = useQueryClient();

  // 고객사 목록 - 모든 역할이 전체 고객사 목록 조회
  const customersQuery = useQuery({
    queryKey: ['customers', filters],
    queryFn: () => customersAPI.getAll(filters),
    staleTime: 0, // 항상 데이터를 stale로 간주하여 재조회 가능하게 함
    gcTime: 5 * 60 * 1000, // 5분간 캐시 유지
  });

  // 고객사 생성
  const createMutation = useMutation({
    mutationFn: (dto: CreateCustomerDto) => customersAPI.create(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  // 고객사 수정
  const updateMutation = useMutation({
    mutationFn: ({ id, dto }: { id: number; dto: UpdateCustomerDto }) =>
      customersAPI.update(id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  // 고객사 삭제
  const deleteMutation = useMutation({
    mutationFn: (id: number) => customersAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    },
  });

  return {
    customers: customersQuery.data || [],
    isLoading: customersQuery.isLoading,
    createCustomer: createMutation.mutateAsync,
    updateCustomer: updateMutation.mutateAsync,
    deleteCustomer: deleteMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
