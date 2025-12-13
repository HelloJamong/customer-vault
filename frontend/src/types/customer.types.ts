export interface Customer {
  id: number;
  name: string;
  location: string | null;

  // 주 담당자
  contactName: string | null;
  contactPosition: string | null;
  contactDepartment: string | null;
  contactMobile: string | null;
  contactPhone: string | null;
  contactEmail: string | null;

  // 계약 정보
  contractType: string;
  contractStartDate: string | null;
  contractEndDate: string | null;

  // 점검 정보
  inspectionCycleType: string;
  inspectionCycleMonth: number | null;
  lastInspectionDate: string | null;
  inspectionStatus?: string; // '점검 완료' | '미완료' | '대상아님'

  // 비고
  notes: string | null;

  // 사내 담당자
  engineerId: number | null;
  engineerSubId: number | null;
  salesId: number | null;

  // 관계
  engineer?: { id: number; name: string } | null;
  engineerSub?: { id: number; name: string } | null;
  sales?: { id: number; name: string } | null;

  // 타임스탬프
  createdAt: string;
  updatedAt: string;
}

export interface CreateCustomerDto {
  name: string;
  location?: string;

  // 주 담당자
  contactName?: string;
  contactPosition?: string;
  contactDepartment?: string;
  contactMobile?: string;
  contactPhone?: string;
  contactEmail?: string;

  // 계약 정보
  contractType?: string;
  contractStartDate?: string;
  contractEndDate?: string;

  // 점검 정보
  inspectionCycleType?: string;
  inspectionCycleMonth?: number;
  lastInspectionDate?: string;

  // 비고
  notes?: string;

  // 사내 담당자
  engineerId?: number;
  engineerSubId?: number;
  salesId?: number;
}

export interface UpdateCustomerDto extends Partial<CreateCustomerDto> {}
