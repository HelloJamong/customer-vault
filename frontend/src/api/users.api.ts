import apiClient from './axios';

export interface UserAssignmentStatus {
  id: number;
  name: string;
  primaryCustomerCount: number;
  secondaryCustomerCount: number;
  description: string;
}

export interface AssignmentStatusResponse {
  users: UserAssignmentStatus[];
}

export const usersAPI = {
  getAssignmentStatus: async (): Promise<AssignmentStatusResponse> => {
    const response = await apiClient.get<AssignmentStatusResponse>(
      '/users/assignment-status',
    );
    return response.data;
  },

  updateDescription: async (
    userId: number,
    description: string,
  ): Promise<{ message: string }> => {
    const response = await apiClient.patch<{ message: string }>(
      `/users/${userId}/description`,
      { description },
    );
    return response.data;
  },
};
