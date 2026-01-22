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
      // Content-Type을 명시적으로 제거하여 브라우저가 자동으로 multipart/form-data와 boundary를 설정하도록 함
      const { data } = await apiClient.post('/documents/my/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log('[Frontend] Upload success:', data);
      return data;
    } catch (error: any) {
      console.error('[Frontend] Upload error:', error);
      console.error('[Frontend] Error response:', error.response?.data);
      console.error('[Frontend] Error status:', error.response?.status);
      throw error;
    }
  },

  // 점검서 삭제 (관리자 전용)
  deleteDocument: async (documentId: number): Promise<void> => {
    await apiClient.delete(`/documents/${documentId}`);
  },
};
