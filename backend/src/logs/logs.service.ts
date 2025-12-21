import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { cleanIpAddress } from '../common/utils/ip.util';
import * as ExcelJS from 'exceljs';

export interface SystemLogEntry {
  id: number;
  timestamp: Date;
  username: string;
  userId: number;
  logType: string;
  action: string;
  description: string;
  ipAddress: string;
  beforeValue?: string;
  afterValue?: string;
}

export interface SystemLogsResponse {
  data: SystemLogEntry[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

@Injectable()
export class LogsService {
  constructor(private prisma: PrismaService) {}

  async createServiceLog(data: {
    userId?: number;
    logType: string;
    action: string;
    description?: string;
    beforeValue?: string;
    afterValue?: string;
    ipAddress?: string;
  }) {
    return this.prisma.serviceLog.create({
      data: {
        userId: data.userId,
        logType: data.logType,
        action: data.action,
        description: data.description,
        beforeValue: data.beforeValue,
        afterValue: data.afterValue,
        ipAddress: cleanIpAddress(data.ipAddress),
      },
    });
  }

  async getServiceLogs(filters?: {
    logType?: string;
    action?: string;
    userId?: number;
    startDate?: string;
    endDate?: string;
  }) {
    const where: any = {};

    if (filters?.logType) where.logType = filters.logType;
    if (filters?.action) where.action = filters.action;
    if (filters?.userId) where.userId = filters.userId;

    if (filters?.startDate && filters?.endDate) {
      where.createdAt = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    }

    return this.prisma.serviceLog.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async getLoginAttempts(filters?: {
    userId?: number;
    success?: boolean;
    startDate?: string;
    endDate?: string;
  }) {
    const where: any = {};

    if (filters?.userId) where.userId = filters.userId;
    if (filters?.success !== undefined) where.success = filters.success;

    if (filters?.startDate && filters?.endDate) {
      where.attemptTime = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    }

    return this.prisma.loginAttempt.findMany({
      where,
      include: {
        user: { select: { id: true, username: true, name: true } },
      },
      orderBy: { attemptTime: 'desc' },
      take: 100,
    });
  }

  async getSystemLogs(filters?: {
    username?: string;
    logType?: string;
    searchText?: string;
    ipAddress?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<SystemLogsResponse> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 30;
    const skip = (page - 1) * limit;

    // 서비스 로그 조회 조건 구성
    const serviceLogWhere: any = {};

    if (filters?.logType) {
      serviceLogWhere.logType = filters.logType;
    }

    if (filters?.searchText) {
      serviceLogWhere.OR = [
        { action: { contains: filters.searchText } },
        { description: { contains: filters.searchText } },
      ];
    }

    if (filters?.ipAddress) {
      serviceLogWhere.ipAddress = { contains: filters.ipAddress };
    }

    if (filters?.startDate && filters?.endDate) {
      serviceLogWhere.createdAt = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    }

    if (filters?.username) {
      serviceLogWhere.user = {
        username: { contains: filters.username },
      };
    }

    // 로그인 시도 조회 조건 구성
    const loginAttemptWhere: any = {};

    if (filters?.ipAddress) {
      loginAttemptWhere.ipAddress = { contains: filters.ipAddress };
    }

    if (filters?.startDate && filters?.endDate) {
      loginAttemptWhere.attemptTime = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    }

    if (filters?.username) {
      loginAttemptWhere.user = {
        username: { contains: filters.username },
      };
    }

    // 로그 타입 필터가 있는 경우 해당 타입만 조회
    let serviceLogs = [];
    let loginAttempts = [];

    if (!filters?.logType || filters.logType === '정상' || filters.logType === '경고' || filters.logType === '오류' || filters.logType === '정보') {
      serviceLogs = await this.prisma.serviceLog.findMany({
        where: serviceLogWhere,
        include: {
          user: { select: { id: true, username: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    // 로그인 시도는 로그 타입 필터가 없거나 '정상', '경고', '오류'인 경우에만 포함
    if (!filters?.logType || filters.logType === '정상' || filters.logType === '경고' || filters.logType === '오류') {
      loginAttempts = await this.prisma.loginAttempt.findMany({
        where: loginAttemptWhere,
        include: {
          user: { select: { id: true, username: true, name: true } },
        },
        orderBy: { attemptTime: 'desc' },
      });
    }

    // 통합 로그 생성
    const allLogs: SystemLogEntry[] = [];

    // 서비스 로그 변환
    for (const log of serviceLogs) {
      allLogs.push({
        id: log.id,
        timestamp: log.createdAt,
        username: log.user?.username || '시스템',
        userId: log.userId || 0,
        logType: log.logType,
        action: log.action,
        description: log.description || '',
        ipAddress: log.ipAddress || '-',
        beforeValue: log.beforeValue || undefined,
        afterValue: log.afterValue || undefined,
      });
    }

    // 로그인 시도 로그 변환
    for (const attempt of loginAttempts) {
      const logType = attempt.success ? '정상' : '경고';
      const action = attempt.success ? '로그인 성공' : '로그인 실패';

      allLogs.push({
        id: attempt.id,
        timestamp: attempt.attemptTime,
        username: attempt.user?.username || '알 수 없음',
        userId: attempt.userId,
        logType,
        action,
        description: attempt.success
          ? `${attempt.user?.username} 사용자가 로그인했습니다.`
          : `${attempt.user?.username} 사용자의 로그인이 실패했습니다.`,
        ipAddress: attempt.ipAddress || '-',
      });
    }

    // 시간순 정렬 (최신순)
    allLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // 검색 텍스트 필터링 (로그인 시도 포함)
    let filteredLogs = allLogs;
    if (filters?.searchText) {
      filteredLogs = allLogs.filter(log =>
        log.action.includes(filters.searchText!) ||
        log.description.includes(filters.searchText!)
      );
    }

    // 전체 개수
    const total = filteredLogs.length;

    // 페이지네이션
    const paginatedLogs = filteredLogs.slice(skip, skip + limit);

    return {
      data: paginatedLogs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async exportSystemLogsToExcel(filters?: {
    username?: string;
    logType?: string;
    searchText?: string;
    ipAddress?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Buffer> {
    // 모든 로그 가져오기 (페이지네이션 없이)
    const result = await this.getSystemLogs({
      ...filters,
      page: 1,
      limit: 999999, // 모든 데이터 가져오기
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('시스템 이력');

    // 헤더 설정
    worksheet.columns = [
      { header: '번호', key: 'id', width: 10 },
      { header: '이력 발생 시간', key: 'timestamp', width: 20 },
      { header: '계정', key: 'username', width: 15 },
      { header: '구분', key: 'logType', width: 10 },
      { header: '작업', key: 'action', width: 20 },
      { header: '세부 정보', key: 'description', width: 40 },
      { header: 'IP 주소', key: 'ipAddress', width: 15 },
      { header: '변경 전', key: 'beforeValue', width: 30 },
      { header: '변경 후', key: 'afterValue', width: 30 },
    ];

    // 헤더 스타일 설정
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // 데이터 추가
    result.data.forEach((log) => {
      worksheet.addRow({
        id: log.id,
        timestamp: new Date(log.timestamp).toLocaleString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        username: log.username,
        logType: log.logType,
        action: log.action,
        description: log.description,
        ipAddress: log.ipAddress,
        beforeValue: log.beforeValue || '-',
        afterValue: log.afterValue || '-',
      });
    });

    // 버퍼로 변환
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async getUploadLogs(filters?: {
    username?: string;
    logType?: string;
    searchText?: string;
    ipAddress?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<SystemLogsResponse> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 30;
    const skip = (page - 1) * limit;

    // 점검서 업로드/삭제 관련 로그만 조회
    const serviceLogWhere: any = {
      OR: [
        { action: { contains: '점검서 업로드' } },
        { action: { contains: '점검서 삭제' } },
      ],
    };

    if (filters?.logType) {
      serviceLogWhere.logType = filters.logType;
    }

    if (filters?.searchText) {
      serviceLogWhere.AND = [
        serviceLogWhere.OR,
        {
          OR: [
            { action: { contains: filters.searchText } },
            { description: { contains: filters.searchText } },
          ],
        },
      ];
      delete serviceLogWhere.OR;
    }

    if (filters?.ipAddress) {
      serviceLogWhere.ipAddress = { contains: filters.ipAddress };
    }

    if (filters?.startDate && filters?.endDate) {
      serviceLogWhere.createdAt = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    }

    if (filters?.username) {
      serviceLogWhere.user = {
        username: { contains: filters.username },
      };
    }

    const serviceLogs = await this.prisma.serviceLog.findMany({
      where: serviceLogWhere,
      include: {
        user: { select: { id: true, username: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 통합 로그 생성
    const allLogs: SystemLogEntry[] = serviceLogs.map((log) => ({
      id: log.id,
      timestamp: log.createdAt,
      username: log.user?.username || '시스템',
      userId: log.userId || 0,
      logType: log.logType,
      action: log.action,
      description: log.description || '',
      ipAddress: log.ipAddress || '-',
      beforeValue: log.beforeValue || undefined,
      afterValue: log.afterValue || undefined,
    }));

    // 전체 개수
    const total = allLogs.length;

    // 페이지네이션
    const paginatedLogs = allLogs.slice(skip, skip + limit);

    return {
      data: paginatedLogs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async exportUploadLogsToExcel(filters?: {
    username?: string;
    logType?: string;
    searchText?: string;
    ipAddress?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Buffer> {
    // 모든 로그 가져오기 (페이지네이션 없이)
    const result = await this.getUploadLogs({
      ...filters,
      page: 1,
      limit: 999999,
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('업로드 이력');

    // 헤더 설정
    worksheet.columns = [
      { header: '번호', key: 'id', width: 10 },
      { header: '이력 발생 시간', key: 'timestamp', width: 20 },
      { header: '계정', key: 'username', width: 15 },
      { header: '구분', key: 'logType', width: 10 },
      { header: '작업', key: 'action', width: 20 },
      { header: '세부 정보', key: 'description', width: 40 },
      { header: 'IP 주소', key: 'ipAddress', width: 15 },
      { header: '변경 전', key: 'beforeValue', width: 30 },
      { header: '변경 후', key: 'afterValue', width: 30 },
    ];

    // 헤더 스타일 설정
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // 데이터 추가
    result.data.forEach((log) => {
      worksheet.addRow({
        id: log.id,
        timestamp: new Date(log.timestamp).toLocaleString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        username: log.username,
        logType: log.logType,
        action: log.action,
        description: log.description,
        ipAddress: log.ipAddress,
        beforeValue: log.beforeValue || '-',
        afterValue: log.afterValue || '-',
      });
    });

    // 버퍼로 변환
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async getLoginLogs(filters?: {
    username?: string;
    logType?: string;
    searchText?: string;
    ipAddress?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }): Promise<SystemLogsResponse> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 30;
    const skip = (page - 1) * limit;

    // 로그인/로그아웃 서비스 로그 조회 조건
    const serviceLogWhere: any = {
      OR: [
        { action: { contains: '로그인' } },
        { action: { contains: '로그아웃' } },
      ],
    };

    if (filters?.ipAddress) {
      serviceLogWhere.ipAddress = { contains: filters.ipAddress };
    }

    if (filters?.startDate && filters?.endDate) {
      serviceLogWhere.createdAt = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    }

    if (filters?.username) {
      serviceLogWhere.user = {
        username: { contains: filters.username },
      };
    }

    if (filters?.logType) {
      serviceLogWhere.logType = filters.logType;
    }

    const serviceLogs = await this.prisma.serviceLog.findMany({
      where: serviceLogWhere,
      include: {
        user: { select: { id: true, username: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    // 로그인 시도 조회 조건 구성
    const loginAttemptWhere: any = {};

    if (filters?.ipAddress) {
      loginAttemptWhere.ipAddress = { contains: filters.ipAddress };
    }

    if (filters?.startDate && filters?.endDate) {
      loginAttemptWhere.attemptTime = {
        gte: new Date(filters.startDate),
        lte: new Date(filters.endDate),
      };
    }

    if (filters?.username) {
      loginAttemptWhere.user = {
        username: { contains: filters.username },
      };
    }

    const loginAttempts = await this.prisma.loginAttempt.findMany({
      where: loginAttemptWhere,
      include: {
        user: { select: { id: true, username: true, name: true } },
      },
      orderBy: { attemptTime: 'desc' },
    });

    // 서비스 로그(로그인/로그아웃) 변환
    const serviceLogEntries: SystemLogEntry[] = serviceLogs.map((log) => ({
      id: log.id,
      timestamp: log.createdAt,
      username: log.user?.username || '시스템',
      userId: log.userId || 0,
      logType: log.logType,
      action: log.action,
      description: log.description || '',
      ipAddress: log.ipAddress || '-',
      beforeValue: log.beforeValue || undefined,
      afterValue: log.afterValue || undefined,
    }));

    // 로그인 시도 로그 변환
    const loginAttemptEntries: SystemLogEntry[] = loginAttempts.map((attempt) => {
      const logType = attempt.success ? '정상' : '경고';
      const action = attempt.success ? '로그인 성공' : '로그인 실패';

      return {
        id: attempt.id,
        timestamp: attempt.attemptTime,
        username: attempt.user?.username || '알 수 없음',
        userId: attempt.userId,
        logType,
        action,
        description: attempt.success
          ? `${attempt.user?.username} 사용자가 로그인했습니다.`
          : `${attempt.user?.username} 사용자의 로그인이 실패했습니다.`,
        ipAddress: attempt.ipAddress || '-',
      };
    });

    // 통합 후 검색/정렬/페이징
    let allLogs: SystemLogEntry[] = [...serviceLogEntries, ...loginAttemptEntries];

    if (filters?.searchText) {
      allLogs = allLogs.filter(
        (log) =>
          log.action.includes(filters.searchText!) ||
          (log.description && log.description.includes(filters.searchText!)),
      );
    }

    // 최신순 정렬
    allLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const total = allLogs.length;
    const paginatedLogs = allLogs.slice(skip, skip + limit);

    return {
      data: paginatedLogs,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async exportLoginLogsToExcel(filters?: {
    username?: string;
    logType?: string;
    searchText?: string;
    ipAddress?: string;
    startDate?: string;
    endDate?: string;
  }): Promise<Buffer> {
    // 모든 로그 가져오기 (페이지네이션 없이)
    const result = await this.getLoginLogs({
      ...filters,
      page: 1,
      limit: 999999,
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('로그인 이력');

    // 헤더 설정
    worksheet.columns = [
      { header: '번호', key: 'id', width: 10 },
      { header: '이력 발생 시간', key: 'timestamp', width: 20 },
      { header: '계정', key: 'username', width: 15 },
      { header: '구분', key: 'logType', width: 10 },
      { header: '작업', key: 'action', width: 20 },
      { header: '세부 정보', key: 'description', width: 40 },
      { header: 'IP 주소', key: 'ipAddress', width: 15 },
    ];

    // 헤더 스타일 설정
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // 데이터 추가
    result.data.forEach((log) => {
      worksheet.addRow({
        id: log.id,
        timestamp: new Date(log.timestamp).toLocaleString('ko-KR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
        username: log.username,
        logType: log.logType,
        action: log.action,
        description: log.description,
        ipAddress: log.ipAddress,
      });
    });

    // 버퍼로 변환
    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }
}
