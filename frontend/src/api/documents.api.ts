import apiClient from './axios';

export interface InspectionTarget {
  id: number;
  customerId: number;
  targetType: string;
  customName?: string;
  productName?: string;
  displayOrder: number;
  createdAt: string;
}

export interface UploadInspectionDocumentDto {
  customerId: number;
  inspectionTargetId: number;
  title: string;
  description?: string;
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
    formData.append('title', dto.title);
    if (dto.description) {
      formData.append('description', dto.description);
    }
    formData.append('inspectionDate', dto.inspectionDate);
    formData.append('inspectionType', dto.inspectionType);
    formData.append('file', dto.file);

    const { data } = await apiClient.post('/documents/my/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return data;
  },
};
