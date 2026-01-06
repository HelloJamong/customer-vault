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

  // 부담당자 1
  contactNameSub1: string | null;
  contactPositionSub1: string | null;
  contactDepartmentSub1: string | null;
  contactMobileSub1: string | null;
  contactPhoneSub1: string | null;
  contactEmailSub1: string | null;

  // 부담당자 2
  contactNameSub2: string | null;
  contactPositionSub2: string | null;
  contactDepartmentSub2: string | null;
  contactMobileSub2: string | null;
  contactPhoneSub2: string | null;
  contactEmailSub2: string | null;

  // 부담당자 3
  contactNameSub3: string | null;
  contactPositionSub3: string | null;
  contactDepartmentSub3: string | null;
  contactMobileSub3: string | null;
  contactPhoneSub3: string | null;
  contactEmailSub3: string | null;

  // 계약 정보
  contractType: string;
  contractStartDate: string | null;
  contractEndDate: string | null;

  // 점검 정보
  inspectionCycleType: string;
  inspectionCycleMonth: number | null;
  lastInspectionDate: string | null;
  inspectionStatus?: string; // '점검 완료' | '미완료' | '대상아님'

  // 버전 정보
  version?: string; // '4.2' | '6.1'

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
  inspectionTargets?: InspectionTarget[];

  // 타임스탬프
  createdAt: string;
  updatedAt: string;
}

export interface InspectionTarget {
  id: number;
  customerId: number;
  targetType: string;
  customName: string | null;
  productName: string | null;
  displayOrder: number;
  createdAt: string;
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

  // 부담당자 1-3
  contactNameSub1?: string;
  contactPositionSub1?: string;
  contactDepartmentSub1?: string;
  contactMobileSub1?: string;
  contactPhoneSub1?: string;
  contactEmailSub1?: string;

  contactNameSub2?: string;
  contactPositionSub2?: string;
  contactDepartmentSub2?: string;
  contactMobileSub2?: string;
  contactPhoneSub2?: string;
  contactEmailSub2?: string;

  contactNameSub3?: string;
  contactPositionSub3?: string;
  contactDepartmentSub3?: string;
  contactMobileSub3?: string;
  contactPhoneSub3?: string;
  contactEmailSub3?: string;

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

export interface CreateInspectionTargetDto {
  customerId: number;
  targetType: string;
  productName?: string;
}

export interface UpdateInspectionTargetDto {
  targetType?: string;
  productName?: string;
  displayOrder?: number;
}
