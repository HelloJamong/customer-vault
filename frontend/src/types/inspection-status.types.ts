export interface MissingInspectionTarget {
  targetId: number;
  targetType: string;
  customName: string | null;
  productName: string | null;
  lastInspectionDate: string | null;
  missingPeriod: string;
  expectedLabel: string;
}

export interface CustomerMissingInspection {
  id: number;
  name: string;
  lastInspectionDate: string | null;
  missingCount: number;
  engineer: { name: string } | null;
  engineerSub: { name: string } | null;
  missingTargets: MissingInspectionTarget[];
}

export interface MissingInspectionsResponse {
  customers: CustomerMissingInspection[];
}
