import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class LogsService {
  constructor(private prisma: PrismaService) {}

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
}
