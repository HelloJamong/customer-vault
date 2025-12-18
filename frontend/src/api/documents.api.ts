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
    console.log('[Frontend] Upload DTO:', dto);

    const formData = new FormData();
    formData.append('customerId', dto.customerId.toString());
    formData.append('inspectionTargetId', dto.inspectionTargetId.toString());
    formData.append('inspectionDate', dto.inspectionDate);
    formData.append('inspectionType', dto.inspectionType);
    formData.append('file', dto.file);

    console.log('[Frontend] FormData entries:');
    for (const [key, value] of formData.entries()) {
      console.log(`  ${key}:`, value);
    }

    try {
      // Content-Type 헤더를 명시하지 않으면 Axios가 자동으로 multipart/form-data와 boundary를 설정
      const { data } = await apiClient.post('/documents/my/upload', formData);
      console.log('[Frontend] Upload success:', data);
      return data;
    } catch (error: any) {
      console.error('[Frontend] Upload error:', error);
      console.error('[Frontend] Error response:', error.response?.data);
      console.error('[Frontend] Error status:', error.response?.status);
      throw error;
    }
  },
};
