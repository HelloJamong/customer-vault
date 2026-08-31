import apiClient from './axios';

export interface InspectionTarget {
  id: number;
  customerId: number;
  targetType: string;
  customName?: string;
  productName?: string;
  displayOrder: number;
  templatePath?: string;
  createdAt: string;
}

export interface UploadInspectionDocumentDto {
  customerId: number;
  inspectionTargetId: number;
  inspectionDate: string;
  inspectionType: string;
  file: File;
}

export const documentsAPI = {
  // 고객사별 점검 대상 조회
  getInspectionTargets: async (customerId: number): Promise<InspectionTarget[]> => {
    const { data } = await apiClient.get(`/inspection-targets/customer/${customerId}`);
    return data;
  },

  // 사용자용 점검서 업로드
  uploadInspectionDocument: async (dto: UploadInspectionDocumentDto): Promise<any> => {
    const formData = new FormData();
    formData.append('customerId', dto.customerId.toString());
    formData.append('inspectionTargetId', dto.inspectionTargetId.toString());
    formData.append('inspectionDate', dto.inspectionDate);
    formData.append('inspectionType', dto.inspectionType);
    formData.append('file', dto.file);

    const { data } = await apiClient.post('/documents/my/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return data;
  },

  // 점검서 삭제 (관리자 전용)
  deleteDocument: async (documentId: number): Promise<void> => {
    await apiClient.delete(`/documents/${documentId}`);
  },
};
