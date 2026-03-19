import apiClient from './axios';

export interface MeetingMinutes {
  id: number;
  customerId: number;
  meetingDate: string;
  attendees: string | null;
  location: string | null;
  subject: string;
  content: string | null;
  decisions: string | null;
  remarks: string | null;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  creator?: { id: number; name: string; username: string };
}

export interface CreateMeetingMinutesData {
  meetingDate: string;
  attendees?: string;
  location?: string;
  subject: string;
  content?: string;
  decisions?: string;
  remarks?: string;
}

export const meetingMinutesApi = {
  getAll: (customerId: number) =>
    apiClient.get<MeetingMinutes[]>(`/meeting-minutes/customer/${customerId}`).then((r) => r.data),
  getOne: (id: number) =>
    apiClient.get<MeetingMinutes>(`/meeting-minutes/${id}`).then((r) => r.data),
  create: (customerId: number, data: CreateMeetingMinutesData) =>
    apiClient.post<MeetingMinutes>(`/meeting-minutes/customer/${customerId}`, data).then((r) => r.data),
  update: (id: number, data: Partial<CreateMeetingMinutesData>) =>
    apiClient.patch<MeetingMinutes>(`/meeting-minutes/${id}`, data).then((r) => r.data),
  remove: (id: number) =>
    apiClient.delete(`/meeting-minutes/${id}`).then((r) => r.data),
};
