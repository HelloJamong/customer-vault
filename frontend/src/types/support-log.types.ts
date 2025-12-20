export interface SupportLog {
  id: number;
  customerId: number;
  supportDate: string;
  inquirer?: string;
  target?: string;
  category?: string;
  userInfo?: string;
  actionStatus?: string;
  inquiryContent?: string;
  actionContent?: string;
  remarks?: string;
  createdBy?: number;
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

export interface CreateSupportLogDto {
  customerId: number;
  supportDate: string;
  inquirer?: string;
  target?: string;
  category?: string;
  userInfo?: string;
  actionStatus?: string;
  inquiryContent?: string;
  actionContent?: string;
  remarks?: string;
}

export interface UpdateSupportLogDto {
  customerId?: number;
  supportDate?: string;
  inquirer?: string;
  target?: string;
  category?: string;
  userInfo?: string;
  actionStatus?: string;
  inquiryContent?: string;
  actionContent?: string;
  remarks?: string;
}
