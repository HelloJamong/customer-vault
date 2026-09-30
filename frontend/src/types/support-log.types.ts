export interface SupportLogEntry {
  id: number;
  supportLogId: number;
  entryDate: string;
  authorName: string;
  content: string;
  createdByUserId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupportLogEntryDto {
  entryDate: string;
  content: string;
}

export interface SupportLog {
  id: number;
  customerId: number;
  supportDate: string;
  inquirer?: string;
  target?: string;
  category?: string;
  title?: string;
  userInfo?: string;
  actionStatus?: string;
  inquiryContent?: string;
  actionContent?: string;
  actionResult?: string;
  jiraTicket?: string;
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
  entries?: SupportLogEntry[];
}

export interface CreateSupportLogDto {
  customerId: number;
  supportDate: string;
  inquirer?: string;
  target?: string;
  category?: string;
  title?: string;
  userInfo?: string;
  actionStatus?: string;
  inquiryContent?: string;
  actionContent?: string;
  actionResult?: string;
  jiraTicket?: string;
  remarks?: string;
  entryContent?: string; // 첫 지원 내역
}

export interface UpdateSupportLogDto {
  customerId?: number;
  supportDate?: string;
  inquirer?: string;
  target?: string;
  category?: string;
  title?: string;
  userInfo?: string;
  actionStatus?: string;
  inquiryContent?: string;
  actionContent?: string;
  actionResult?: string;
  jiraTicket?: string;
  remarks?: string;
}
