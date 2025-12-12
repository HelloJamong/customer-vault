export interface Customer {
  id: number;
  name: string;
  contract_start: string | null;
  contract_end: string | null;
  inspection_cycle_months: number;
  last_inspection_date: string | null;
  next_inspection_date: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  assigned_user_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCustomerDto {
  name: string;
  contract_start?: string;
  contract_end?: string;
  inspection_cycle_months: number;
  last_inspection_date?: string;
  contact_person?: string;
  contact_phone?: string;
  contact_email?: string;
  address?: string;
  notes?: string;
  assigned_user_id?: number;
}

export interface UpdateCustomerDto extends Partial<CreateCustomerDto> {
  is_active?: boolean;
}
