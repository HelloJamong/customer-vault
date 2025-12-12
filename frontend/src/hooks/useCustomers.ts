import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { customersAPI } from '@/api/customers.api';
import type { CreateCustomerDto, UpdateCustomerDto } from '@/types/customer.types';

export const useCustomers = () => {
  const queryClient = useQueryClient();

  // 고객사 목록
  const customersQuery = useQuery({
    queryKey: ['customers'],
    queryFn: customersAPI.getAll,
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
    createCustomer: createMutation.mutate,
    updateCustomer: updateMutation.mutate,
    deleteCustomer: deleteMutation.mutate,
    isCreating: createMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
  };
};
