import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

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
        ipAddress: data.ipAddress,
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
}
