import apiClient from './axios';

export interface EquipmentInfo {
  systemType: string;
  hostname?: string;
  model?: string;
  serialNumber?: string;
  os?: string;
  serverIp?: string;
}

export interface HardwareSpecs {
  cpuModel?: string;
  cpuCores?: number;
  memoryCapacity?: string;
}

export interface InspectionReport {
  id: number;
  customerId: number;
  templateType: 'MGVS' | 'VMMG' | 'VMVS';
  inspectionYear: number;
  inspectionMonth: number;
  inspectionDate: string;
  inspectionLocation?: string;
  inspectionCycle?: string;
  customerName: string;
  customerDepartment?: string;
  customerContact?: string;
  customerPhone?: string;
  inspectorName: string;
  inspectorPhone?: string;
  equipmentInfo: EquipmentInfo[];
  hardwareSpecs?: HardwareSpecs;
  hrIntegrationEnabled: boolean;
  redundancyEnabled: boolean;
  customerRequest?: string;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  customer?: {
    id: number;
    name: string;
  };
  creator?: {
    id: number;
    name: string;
    username: string;
  };
}

export interface CreateInspectionReportDto {
  customerId: number;
  templateType: 'MGVS' | 'VMMG' | 'VMVS';
  inspectionYear: number;
  inspectionMonth: number;
  inspectionDate: string;
  inspectionLocation?: string;
  inspectionCycle?: string;
  customerName: string;
  customerDepartment?: string;
  customerContact?: string;
  customerPhone?: string;
  inspectorName: string;
  inspectorPhone?: string;
  equipmentInfo: EquipmentInfo[];
  hardwareSpecs?: HardwareSpecs;
  hrIntegrationEnabled?: boolean;
  redundancyEnabled?: boolean;
  customerRequest?: string;
}

export interface UpdateInspectionReportDto
  extends Partial<CreateInspectionReportDto> {}

export const inspectionReportsApi = {
  // 점검서 목록 조회
  getAll: async (customerId?: number): Promise<InspectionReport[]> => {
    const params = customerId ? { customerId } : {};
    const response = await apiClient.get('/inspection-reports', { params });
    return response.data;
  },

  // 점검서 상세 조회
  getById: async (id: number): Promise<InspectionReport> => {
    const response = await apiClient.get(`/inspection-reports/${id}`);
    return response.data;
  },

  // 점검서 생성
  create: async (
    data: CreateInspectionReportDto,
  ): Promise<InspectionReport> => {
    const response = await apiClient.post('/inspection-reports', data);
    return response.data;
  },

  // 점검서 수정
  update: async (
    id: number,
    data: UpdateInspectionReportDto,
  ): Promise<InspectionReport> => {
    const response = await apiClient.patch(`/inspection-reports/${id}`, data);
    return response.data;
  },

  // 점검서 삭제
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/inspection-reports/${id}`);
  },

  // 점검서 Word 파일 다운로드
  downloadWord: async (id: number, filename: string): Promise<void> => {
    const response = await apiClient.get(
      `/inspection-reports/${id}/download`,
      {
        responseType: 'blob',
      },
    );

    // Blob으로 다운로드
    const blob = new Blob([response.data], {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },
};
